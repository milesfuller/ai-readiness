import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSurveyTemplateService } from '@/services/database/survey-template.service'

export async function POST(
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
    const { title, organizationId } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Use SurveyTemplateService for template operations
    const surveyTemplateService = createSurveyTemplateService()
    
    // Get source template with questions
    const sourceTemplate = await surveyTemplateService.getTemplate(templateId, true)
    
    if (!sourceTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create duplicate template
    const duplicateData = {
      ...sourceTemplate,
      title,
      organization_id: organizationId,
      status: 'draft' // New templates start as draft
    }
    // Remove properties that will be auto-generated
    const { id, created_at, updated_at, ...cleanDuplicateData } = duplicateData
    
    const newTemplate = await surveyTemplateService.createTemplate(cleanDuplicateData, user.id)
    
    // Copy questions if they exist
    const questions = await surveyTemplateService.getTemplateQuestions(templateId)
    for (const question of questions) {
      const { id: qId, created_at: qCreated, updated_at: qUpdated, ...questionData } = {
        ...question,
        template_id: newTemplate.id
      }
      
      await surveyTemplateService.addQuestion(newTemplate.id, questionData)
    }
    
    // Get the complete new template with questions
    const completeNewTemplate = await surveyTemplateService.getTemplate(newTemplate.id, true)

    return NextResponse.json(completeNewTemplate, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}