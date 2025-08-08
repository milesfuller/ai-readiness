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

    // Use SurveyTemplateService to get questions
    const surveyTemplateService = createSurveyTemplateService()
    const questions = await surveyTemplateService.getTemplateQuestions(templateId)

    return NextResponse.json(questions)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const {
      questionText,
      questionType,
      description,
      placeholderText,
      helpText,
      options = [],
      validationRules = {},
      required = true,
      groupId,
      groupTitle,
      orderIndex,
      jtbdCategory,
      jtbdWeight = 1.0,
      tags = [],
      displayConditions = {},
      skipLogic = {},
      analyticsEnabled = true
    } = body

    // Validate required fields
    if (!questionText || !questionType) {
      return NextResponse.json(
        { error: 'Missing required fields: questionText, questionType' },
        { status: 400 }
      )
    }

    // Use SurveyTemplateService to verify template exists
    const surveyTemplateService = createSurveyTemplateService()
    const template = await surveyTemplateService.getTemplate(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Add question using the service
    const question = await surveyTemplateService.addQuestion(templateId, {
      question_text: questionText,
      question_type: questionType,
      description,
      placeholder_text: placeholderText,
      help_text: helpText,
      options,
      validation_rules: validationRules,
      required,
      group_id: groupId,
      group_title: groupTitle,
      order_index: orderIndex,
      jtbd_category: jtbdCategory,
      jtbd_weight: jtbdWeight,
      tags,
      display_conditions: displayConditions,
      skip_logic: skipLogic,
      analytics_enabled: analyticsEnabled
    } as any)

    return NextResponse.json(question, { status: 201 })

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
    const { questions } = body

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions must be an array' }, { status: 400 })
    }

    // Use SurveyTemplateService to verify template exists
    const surveyTemplateService = createSurveyTemplateService()
    const template = await surveyTemplateService.getTemplate(templateId)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Delete existing questions first
    const existingQuestions = await surveyTemplateService.getTemplateQuestions(templateId)
    for (const question of existingQuestions) {
      await surveyTemplateService.deleteQuestion(question.id)
    }

    // Add new questions
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index]
      await surveyTemplateService.addQuestion(templateId, {
        question_text: q.questionText,
        question_type: q.questionType,
        description: q.description,
        placeholder_text: q.placeholderText,
        help_text: q.helpText,
        options: q.options || [],
        validation_rules: q.validationRules || {},
        required: q.required !== false,
        group_id: q.groupId,
        group_title: q.groupTitle,
        order_index: q.orderIndex !== undefined ? q.orderIndex : index,
        jtbd_category: q.jtbdCategory,
        jtbd_weight: q.jtbdWeight || 1.0,
        tags: q.tags || [],
        display_conditions: q.displayConditions || {},
        skip_logic: q.skipLogic || {},
        analytics_enabled: q.analyticsEnabled !== false
      } as any)
    }

    // Get updated questions
    const updatedQuestions = await surveyTemplateService.getTemplateQuestions(templateId)

    return NextResponse.json(updatedQuestions)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}