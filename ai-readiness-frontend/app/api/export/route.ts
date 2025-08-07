export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exportService } from '@/lib/services/export-service'
import { ExportOptions, UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      )
    }

    // Get user role from metadata
    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id

    // Check export permission
    if (!hasPermission(userRole, PERMISSIONS.API_EXPORT_ACCESS)) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: 'Access denied. Export privileges required.',
            userRole,
            requiredPermission: PERMISSIONS.API_EXPORT_ACCESS
          },
          { status: 403 }
        )
      )
    }

    // Parse request body
    const body = await request.json()
    const { 
      options, 
      surveyId, 
      organizationId, 
      type = 'data' 
    }: {
      options: ExportOptions
      surveyId?: string
      organizationId?: string
      type?: 'data' | 'survey_report' | 'organization_report'
    } = body

    // Validate export options
    if (!options || !options.format) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { error: 'Invalid export options' },
          { status: 400 }
        )
      )
    }

    // Check permissions for personal data export
    if (options.includePersonalData && !hasPermission(userRole, PERMISSIONS.ADMIN_EXPORT_ALL)) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: 'Insufficient permissions to export personal data',
            userRole,
            requiredPermission: PERMISSIONS.ADMIN_EXPORT_ALL
          },
          { status: 403 }
        )
      )
    }

    // Check organization access
    if (organizationId && !canAccessOrganization(userRole, userOrgId, organizationId)) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: 'Access denied: Cannot access organization data',
            userRole,
            userOrgId,
            requestedOrgId: organizationId
          },
          { status: 403 }
        )
      )
    }

    // If surveyId provided, check if it belongs to user's accessible organization
    if (surveyId && userRole !== 'system_admin') {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('organization_id')
        .eq('id', surveyId)
        .single()

      if (surveyError || !survey) {
        return addAPISecurityHeaders(
          NextResponse.json(
            { error: 'Survey not found' },
            { status: 404 }
          )
        )
      }

      // Check if user can access the survey's organization
      if (!canAccessOrganization(userRole, userOrgId, survey.organization_id)) {
        return addAPISecurityHeaders(
          NextResponse.json(
            { 
              error: 'Access denied: Survey not accessible',
              userRole,
              userOrgId,
              surveyOrgId: survey.organization_id
            },
            { status: 403 }
          )
        )
      }
    }

    // Log export request for audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'export_data',
        resource_type: type,
        resource_id: surveyId || organizationId || 'all',
        metadata: {
          format: options.format,
          includePersonalData: options.includePersonalData,
          filters: options.filters,
          dateRange: options.dateRange,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })
      .select()

    let result: Blob | string
    let filename: string
    let mimeType: string

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().split('T')[0]

    try {
      // Initialize export service with current user context
      await exportService.initializeUser()
      
      // Set organization filter for org_admin users
      if (userRole === 'org_admin' && userOrgId) {
        options.filters = {
          ...options.filters,
          organizationId: userOrgId
        }
      }
      
      // Add survey filter if surveyId provided
      if (surveyId) {
        options.filters = {
          ...options.filters,
          surveyId: surveyId
        }
      }

      switch (type) {
        case 'survey_report':
          if (!surveyId) {
            return addAPISecurityHeaders(
              NextResponse.json(
                { error: 'Survey ID required for survey report' },
                { status: 400 }
              )
            )
          }
          result = await exportService.generateSurveyPDF(surveyId, options)
          filename = `survey-report-${surveyId}-${timestamp}.pdf`
          mimeType = 'application/pdf'
          break

        case 'organization_report':
          if (!organizationId) {
            return addAPISecurityHeaders(
              NextResponse.json(
                { error: 'Organization ID required for organization report' },
                { status: 400 }
              )
            )
          }
          result = await exportService.generateOrganizationReport(organizationId, options)
          filename = `organization-report-${organizationId}-${timestamp}.pdf`
          mimeType = 'application/pdf'
          break

        case 'data':
        default:
          result = await exportService.exportData(options)
          
          if (options.format === 'csv') {
            filename = `survey-data-${timestamp}.csv`
            mimeType = 'text/csv'
          } else if (options.format === 'json') {
            filename = `survey-data-${timestamp}.json`
            mimeType = 'application/json'
          } else {
            return addAPISecurityHeaders(
              NextResponse.json(
                { error: 'Unsupported format for data export' },
                { status: 400 }
              )
            )
          }
          break
      }

      // Convert result to buffer if it's a Blob
      let buffer: Buffer
      if (result instanceof Blob) {
        buffer = Buffer.from(await result.arrayBuffer())
      } else {
        buffer = Buffer.from(result, 'utf-8')
      }

      // Return file as download with security headers
      const response = new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      return addAPISecurityHeaders(response)

    } catch (exportError) {
      // eslint-disable-next-line no-console
      console.error('Export generation failed:', exportError)
      
      // Log failed export attempt
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'export_failed',
          resource_type: type,
          resource_id: surveyId || organizationId || 'all',
          metadata: {
            error: exportError instanceof Error ? exportError.message : 'Unknown error',
            format: options.format,
            timestamp: new Date().toISOString()
          }
        })

      return addAPISecurityHeaders(
        NextResponse.json(
          { error: 'Export generation failed', details: exportError instanceof Error ? exportError.message : 'Unknown error' },
          { status: 500 }
        )
      )
    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Export API error:', error)
    return addAPISecurityHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      )
    }

    // Get user role from metadata
    const userRole = (user.user_metadata?.role as UserRole) || 'user'

    // Check export permission
    if (!hasPermission(userRole, PERMISSIONS.API_EXPORT_ACCESS)) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: 'Access denied. Export privileges required.',
            userRole,
            requiredPermission: PERMISSIONS.API_EXPORT_ACCESS
          },
          { status: 403 }
        )
      )
    }

    // Get available export formats based on user role
    const formats = exportService.getAvailableFormats()
    
    // Get export statistics for the user (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: exportStats, error: statsError } = await supabase
      .from('audit_logs')
      .select('action, created_at, metadata')
      .eq('user_id', user.id)
      .eq('action', 'export_data')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    if (statsError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch export stats:', statsError)
    }

    return addAPISecurityHeaders(
      NextResponse.json({
        formats,
        canExportPersonalData: hasPermission(userRole, PERMISSIONS.ADMIN_EXPORT_ALL),
        recentExports: exportStats?.slice(0, 10) || [],
        exportCount: exportStats?.length || 0,
        userRole,
        permissions: {
          canExportData: hasPermission(userRole, PERMISSIONS.API_EXPORT_ACCESS),
          canExportPersonalData: hasPermission(userRole, PERMISSIONS.ADMIN_EXPORT_ALL),
          canExportAllOrgs: hasPermission(userRole, PERMISSIONS.ORG_VIEW_ALL)
        }
      })
    )

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Export info API error:', error)
    return addAPISecurityHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    )
  }
}