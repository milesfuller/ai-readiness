/**
 * Report Generation API Endpoint
 * 
 * Handles report generation requests with support for multiple formats,
 * template customization, and asynchronous processing with progress tracking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/services/database/reporting.service'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// ============================================================================
// GENERATE REPORT ENDPOINT
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    
    // Validate required parameters
    const validationResult = validateGenerateRequest(body)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          code: 'VALIDATION_ERROR',
          details: validationResult.errors 
        },
        { status: 400 }
      )
    }

    const {
      templateId,
      organizationId,
      format = 'pdf',
      filters,
      options
    } = body

    // Verify user has access to organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Access denied to organization', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // Check if user has report generation permissions
    const hasPermission = checkReportPermissions(orgMember.role, 'generate')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for report generation', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Generate report
    const result = await reportingService.generateReport({
      templateId,
      organizationId,
      format,
      filters: {
        ...filters,
        // Ensure user can only access their organization's data
        organizationId
      },
      options: {
        ...options,
        generated_by: user.id,
        generated_at: new Date().toISOString()
      }
    })

    // Log report generation activity
    await logReportActivity({
      user_id: user.id,
      organization_id: organizationId,
      action: 'report_generated',
      report_id: result.reportId,
      template_id: templateId,
      format,
      metadata: { filters, options }
    })

    return NextResponse.json({
      success: true,
      data: {
        reportId: result.reportId,
        status: result.status,
        estimatedCompletionTime: calculateEstimatedCompletion(templateId, format),
        statusCheckUrl: `/api/reports/status/${result.reportId}`
      }
    })

  } catch (error) {
    console.error('Error generating report:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Template not found')) {
        return NextResponse.json(
          { error: 'Report template not found', code: 'TEMPLATE_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('concurrent reports limit')) {
        return NextResponse.json(
          { error: 'Too many concurrent reports. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate report', code: 'GENERATION_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET GENERATION STATUS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    const organizationId = searchParams.get('organizationId')

    if (!reportId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters', code: 'MISSING_PARAMS' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Verify user has access to organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Access denied to organization', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // Get report status
    const reportStatus = await reportingService.getReportStatus(reportId, organizationId)
    
    if (!reportStatus) {
      return NextResponse.json(
        { error: 'Report not found', code: 'REPORT_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: reportStatus.id,
        status: reportStatus.status,
        progress: reportStatus.progress,
        title: reportStatus.title,
        format: reportStatus.format,
        generated_at: reportStatus.generated_at,
        expires_at: reportStatus.expires_at,
        file_url: reportStatus.file_url,
        file_size: reportStatus.file_size,
        error_message: reportStatus.error_message,
        download_count: reportStatus.download_count,
        metadata: reportStatus.metadata
      }
    })

  } catch (error) {
    console.error('Error fetching report status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report status', code: 'STATUS_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateGenerateRequest(body: any) {
  const errors: string[] = []
  
  if (!body.templateId) {
    errors.push('templateId is required')
  }
  
  if (!body.organizationId) {
    errors.push('organizationId is required')
  }
  
  if (body.format && !['pdf', 'excel', 'powerpoint', 'json', 'html'].includes(body.format)) {
    errors.push('Invalid format. Must be one of: pdf, excel, powerpoint, json, html')
  }

  if (body.filters) {
    if (body.filters.dateRange) {
      const { start, end } = body.filters.dateRange
      if (start && end) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          errors.push('Invalid date format in dateRange filter')
        }
        if (startDate >= endDate) {
          errors.push('Start date must be before end date')
        }
        // Limit date range to prevent excessive data processing
        const maxDaysRange = 365
        const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysDiff > maxDaysRange) {
          errors.push(`Date range cannot exceed ${maxDaysRange} days`)
        }
      }
    }
  }

  if (body.options) {
    if (body.options.expires_in_days && (body.options.expires_in_days < 1 || body.options.expires_in_days > 90)) {
      errors.push('expires_in_days must be between 1 and 90')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

function checkReportPermissions(role: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    'super_admin': ['generate', 'schedule', 'manage', 'delete'],
    'admin': ['generate', 'schedule', 'manage'],
    'manager': ['generate', 'schedule'],
    'member': ['generate'],
    'viewer': []
  }
  
  return permissions[role]?.includes(action) || false
}

function calculateEstimatedCompletion(templateId: string, format: string): string {
  // Estimation based on template complexity and format
  const templateComplexity = {
    'executive': 2,
    'analytics': 8,
    'jtbd': 5,
    'voice': 4,
    'segment': 6
  }
  
  const formatMultiplier = {
    'json': 1,
    'html': 1.5,
    'pdf': 2,
    'excel': 2.5,
    'powerpoint': 3
  }
  
  const baseTime = 60 // seconds
  const templateType = templateId.split('_')[0] || 'executive'
  const complexity = templateComplexity[templateType as keyof typeof templateComplexity] || 2
  const multiplier = formatMultiplier[format as keyof typeof formatMultiplier] || 2
  
  const estimatedSeconds = baseTime * complexity * multiplier
  const minutes = Math.ceil(estimatedSeconds / 60)
  
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

async function logReportActivity(params: {
  user_id: string
  organization_id: string
  action: string
  report_id: string
  template_id: string
  format: string
  metadata: any
}) {
  try {
    const supabase = await createClient()
    
    await supabase
      .from('activity_logs')
      .insert({
        user_id: params.user_id,
        organization_id: params.organization_id,
        action: params.action,
        resource_type: 'report',
        resource_id: params.report_id,
        metadata: {
          template_id: params.template_id,
          format: params.format,
          ...params.metadata
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log report activity:', error)
    // Don't fail the main operation if logging fails
  }
}

// ============================================================================
// RATE LIMITING AND SECURITY
// ============================================================================

const generateRateLimits = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, organizationId: string): boolean {
  const key = `${userId}_${organizationId}`
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 10 // 10 reports per hour per user per org
  
  let userLimit = generateRateLimits.get(key)
  
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = { count: 1, resetTime: now + windowMs }
    generateRateLimits.set(key, userLimit)
    return true
  }
  
  if (userLimit.count >= maxRequests) {
    return false
  }
  
  userLimit.count++
  return true
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, limit] of generateRateLimits.entries()) {
    if (now > limit.resetTime) {
      generateRateLimits.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean every 5 minutes