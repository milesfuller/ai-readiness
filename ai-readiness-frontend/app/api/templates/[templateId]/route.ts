import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSurveyTemplateService } from '@/services/database/survey-template.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { templateId } = params

    // Use SurveyTemplateService to get template with related data
    const surveyTemplateService = createSurveyTemplateService()
    const template = await surveyTemplateService.getTemplate(templateId, true)
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    const { templateId } = params
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      category,
      visibility,
      estimatedDuration,
      difficultyLevel,
      tags,
      introductionText,
      conclusionText,
      settings,
      status,
      versionNotes
    } = body

    // Use SurveyTemplateService to get template for permission check
    const surveyTemplateService = createSurveyTemplateService()
    const existingTemplate = await surveyTemplateService.getTemplate(templateId)
    
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create version if this is a significant update
    if (versionNotes) {
      await surveyTemplateService.createVersion(templateId, versionNotes, user.id)
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (visibility !== undefined) updateData.visibility = visibility
    if (estimatedDuration !== undefined) updateData.estimated_duration = estimatedDuration
    if (difficultyLevel !== undefined) updateData.difficulty_level = difficultyLevel
    if (tags !== undefined) updateData.tags = tags
    if (introductionText !== undefined) updateData.introduction_text = introductionText
    if (conclusionText !== undefined) updateData.conclusion_text = conclusionText
    if (settings !== undefined) updateData.settings = settings
    if (status !== undefined) {
      updateData.status = status
      if (status === 'published' && !existingTemplate.published_at) {
        updateData.published_at = new Date()
      } else if (status === 'archived') {
        updateData.archived_at = new Date()
      }
    }

    // Use SurveyTemplateService to update template
    const template = await surveyTemplateService.updateTemplate(templateId, updateData)

    return NextResponse.json(template)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    const { templateId } = params
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use SurveyTemplateService to get and validate template
    const surveyTemplateService = createSurveyTemplateService()
    const template = await surveyTemplateService.getTemplate(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Don't allow deletion of published marketplace templates
    if (template.status === 'marketplace') {
      return NextResponse.json(
        { error: 'Cannot delete marketplace templates' },
        { status: 400 }
      )
    }

    // Use SurveyTemplateService to delete template (soft delete)
    await surveyTemplateService.deleteTemplate(templateId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}