/**
 * Scheduled Reports API Endpoint
 * 
 * Handles CRUD operations for scheduled reports including creation,
 * modification, activation/deactivation, and execution history.
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/services/database/reporting.service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// CREATE SCHEDULED REPORT
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
    const validationResult = validateScheduleRequest(body)
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
      name,
      description,
      schedule,
      format = 'pdf',
      recipients = [],
      filters
    } = body

    // Verify user has access to organization and can schedule reports
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

    const hasPermission = checkSchedulePermissions(orgMember.role)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for report scheduling', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate recipients if provided
    if (recipients.length > 0) {
      const recipientValidation = await validateRecipients(recipients, organizationId, supabase)
      if (!recipientValidation.isValid) {
        return NextResponse.json(
          { 
            error: 'Invalid recipients', 
            code: 'INVALID_RECIPIENTS',
            details: recipientValidation.errors 
          },
          { status: 400 }
        )
      }
    }

    // Check organization limits for scheduled reports
    const canSchedule = await checkSchedulingLimits(organizationId, supabase)
    if (!canSchedule.allowed) {
      return NextResponse.json(
        { 
          error: 'Scheduling limit exceeded', 
          code: 'LIMIT_EXCEEDED',
          details: { limit: canSchedule.limit, current: canSchedule.current }
        },
        { status: 429 }
      )
    }

    // Create scheduled report
    const scheduledReport = await reportingService.scheduleReport({
      templateId,
      organizationId,
      name,
      description,
      schedule,
      format,
      recipients,
      filters: {
        ...filters,
        organizationId // Ensure data access is restricted
      }
    })

    // Log scheduling activity
    await logScheduleActivity({
      user_id: user.id,
      organization_id: organizationId,
      action: 'schedule_created',
      schedule_id: scheduledReport.id,
      metadata: { name, schedule, format, recipients: recipients.length }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: scheduledReport.id,
        name: scheduledReport.name,
        status: 'active',
        next_run_at: scheduledReport.next_run_at,
        created_at: scheduledReport.created_at
      }
    })

  } catch (error) {
    console.error('Error creating scheduled report:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Template not found')) {
        return NextResponse.json(
          { error: 'Report template not found', code: 'TEMPLATE_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create scheduled report', code: 'CREATION_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET SCHEDULED REPORTS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required', code: 'MISSING_ORGANIZATION' },
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

    // Get scheduled reports
    const scheduledReports = await reportingService.getScheduledReports(organizationId)

    // Filter by status if specified
    const filteredReports = status 
      ? scheduledReports.filter(report => report.is_active === (status === 'active'))
      : scheduledReports

    // Apply pagination
    const paginatedReports = filteredReports.slice(offset, offset + limit)
    
    // Enrich with execution history
    const enrichedReports = await Promise.all(
      paginatedReports.map(async (report) => {
        const executionHistory = await getRecentExecutions(report.id, 5)
        return {
          ...report,
          recent_executions: executionHistory,
          success_rate: report.run_count > 0 ? (report.success_count / report.run_count) * 100 : 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        reports: enrichedReports,
        pagination: {
          total: filteredReports.length,
          limit,
          offset,
          has_more: offset + limit < filteredReports.length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports', code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// UPDATE SCHEDULED REPORT
// ============================================================================

export async function PUT(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const { scheduleId, ...updateData } = body

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId is required', code: 'MISSING_SCHEDULE_ID' },
        { status: 400 }
      )
    }

    // Get existing scheduled report to verify access
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select('*, organization_id')
      .eq('id', scheduleId)
      .single()

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Scheduled report not found', code: 'SCHEDULE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify user has access to organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', existingSchedule.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Access denied to organization', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    const hasPermission = checkSchedulePermissions(orgMember.role)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for schedule modification', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Validate update data
    const validationResult = validateScheduleUpdate(updateData)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid update parameters', 
          code: 'VALIDATION_ERROR',
          details: validationResult.errors 
        },
        { status: 400 }
      )
    }

    // Calculate next run time if schedule changed
    let nextRunAt = existingSchedule.next_run_at
    if (updateData.schedule) {
      nextRunAt = calculateNextRun(updateData.schedule)
    }

    // Update scheduled report
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('scheduled_reports')
      .update({
        ...updateData,
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log update activity
    await logScheduleActivity({
      user_id: user.id,
      organization_id: existingSchedule.organization_id,
      action: 'schedule_updated',
      schedule_id: scheduleId,
      metadata: { updated_fields: Object.keys(updateData) }
    })

    return NextResponse.json({
      success: true,
      data: updatedSchedule
    })

  } catch (error) {
    console.error('Error updating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled report', code: 'UPDATE_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE SCHEDULED REPORT
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')
    const organizationId = searchParams.get('organizationId')

    if (!scheduleId || !organizationId) {
      return NextResponse.json(
        { error: 'scheduleId and organizationId are required', code: 'MISSING_PARAMS' },
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

    // Verify user has access and permissions
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

    const hasPermission = checkSchedulePermissions(orgMember.role) && 
                         ['admin', 'super_admin'].includes(orgMember.role)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for schedule deletion', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Delete scheduled report
    const { error: deleteError } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)

    if (deleteError) throw deleteError

    // Log deletion activity
    await logScheduleActivity({
      user_id: user.id,
      organization_id: organizationId,
      action: 'schedule_deleted',
      schedule_id: scheduleId,
      metadata: {}
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled report', code: 'DELETE_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateScheduleRequest(body: any) {
  const errors: string[] = []
  
  if (!body.templateId) errors.push('templateId is required')
  if (!body.organizationId) errors.push('organizationId is required')
  if (!body.name) errors.push('name is required')
  if (!body.schedule) errors.push('schedule is required')
  
  if (body.schedule) {
    const { frequency, hour, minute, timezone } = body.schedule
    
    if (!['daily', 'weekly', 'monthly', 'quarterly', 'custom'].includes(frequency)) {
      errors.push('Invalid schedule frequency')
    }
    
    if (typeof hour !== 'number' || hour < 0 || hour > 23) {
      errors.push('Invalid hour (must be 0-23)')
    }
    
    if (typeof minute !== 'number' || minute < 0 || minute > 59) {
      errors.push('Invalid minute (must be 0-59)')
    }
    
    if (!timezone) {
      errors.push('timezone is required')
    }
    
    if (frequency === 'weekly' && (typeof body.schedule.day_of_week !== 'number' || body.schedule.day_of_week < 0 || body.schedule.day_of_week > 6)) {
      errors.push('Invalid day_of_week for weekly schedule (must be 0-6)')
    }
    
    if (frequency === 'monthly' && (typeof body.schedule.day_of_month !== 'number' || body.schedule.day_of_month < 1 || body.schedule.day_of_month > 31)) {
      errors.push('Invalid day_of_month for monthly schedule (must be 1-31)')
    }
  }
  
  if (body.format && !['pdf', 'excel', 'powerpoint'].includes(body.format)) {
    errors.push('Invalid format for scheduled reports')
  }
  
  if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 50) {
    errors.push('Too many recipients (maximum 50)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

function validateScheduleUpdate(updateData: any) {
  const errors: string[] = []
  
  if (updateData.name && typeof updateData.name !== 'string') {
    errors.push('name must be a string')
  }
  
  if (updateData.is_active !== undefined && typeof updateData.is_active !== 'boolean') {
    errors.push('is_active must be a boolean')
  }
  
  if (updateData.schedule) {
    const scheduleValidation = validateScheduleRequest({ schedule: updateData.schedule })
    errors.push(...scheduleValidation.errors)
  }
  
  if (updateData.recipients && (!Array.isArray(updateData.recipients) || updateData.recipients.length > 50)) {
    errors.push('recipients must be an array with maximum 50 items')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

async function validateRecipients(recipients: string[], organizationId: string, supabase: any) {
  const errors: string[] = []
  
  try {
    // Check if all recipients are valid email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = recipients.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`)
    }
    
    // Check if recipients have access to the organization (optional validation)
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('profiles!inner(email)')
      .eq('organization_id', organizationId)
    
    const orgEmails = new Set(orgMembers?.map((m: any) => m.profiles.email) || [])
    const externalRecipients = recipients.filter(email => !orgEmails.has(email))
    
    if (externalRecipients.length > 0) {
      // Log warning but don't fail - external recipients might be allowed
      console.warn(`External recipients detected: ${externalRecipients.join(', ')}`)
    }
    
  } catch (error) {
    console.error('Error validating recipients:', error)
    errors.push('Failed to validate recipients')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

function checkSchedulePermissions(role: string): boolean {
  return ['super_admin', 'admin', 'manager'].includes(role)
}

async function checkSchedulingLimits(organizationId: string, supabase: any) {
  try {
    const { data: existingSchedules, error } = await supabase
      .from('scheduled_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    
    if (error) throw error
    
    const limit = 25 // Maximum active schedules per organization
    const current = existingSchedules?.length || 0
    
    return {
      allowed: current < limit,
      limit,
      current
    }
  } catch (error) {
    console.error('Error checking scheduling limits:', error)
    return { allowed: false, limit: 0, current: 0 }
  }
}

function calculateNextRun(schedule: any): Date {
  const now = new Date()
  const nextRun = new Date(now)
  
  // Set time
  nextRun.setHours(schedule.hour, schedule.minute, 0, 0)
  
  // If time has passed today, move to next occurrence
  if (nextRun <= now) {
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        const daysDiff = (schedule.day_of_week - nextRun.getDay() + 7) % 7
        nextRun.setDate(nextRun.getDate() + (daysDiff === 0 ? 7 : daysDiff))
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(schedule.day_of_month)
        break
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3)
        nextRun.setDate(schedule.day_of_month || 1)
        break
    }
  }
  
  return nextRun
}

async function getRecentExecutions(scheduleId: string, limit: number = 5) {
  try {
    const supabase = await createClient()
    
    const { data: executions } = await supabase
      .from('generated_reports')
      .select('id, status, generated_at, error_message')
      .eq('schedule_id', scheduleId)
      .order('generated_at', { ascending: false })
      .limit(limit)
    
    return executions || []
  } catch (error) {
    console.error('Error fetching execution history:', error)
    return []
  }
}

async function logScheduleActivity(params: {
  user_id: string
  organization_id: string
  action: string
  schedule_id: string
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
        resource_type: 'scheduled_report',
        resource_id: params.schedule_id,
        metadata: params.metadata,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log schedule activity:', error)
  }
}