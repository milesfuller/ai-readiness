import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { templateId } = params

    const { data: questions, error } = await supabase
      .from('survey_template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json(questions || [])

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

    // Check if template exists and user has permission
    const { data: template } = await supabase
      .from('survey_templates')
      .select('created_by, organization_id')
      .eq('id', templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get next order index if not provided
    let finalOrderIndex = orderIndex
    if (finalOrderIndex === undefined) {
      const { data: lastQuestion } = await supabase
        .from('survey_template_questions')
        .select('order_index')
        .eq('template_id', templateId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      
      finalOrderIndex = (lastQuestion?.order_index || 0) + 1
    }

    const { data: question, error } = await supabase
      .from('survey_template_questions')
      .insert({
        template_id: templateId,
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
        order_index: finalOrderIndex,
        jtbd_category: jtbdCategory,
        jtbd_weight: jtbdWeight,
        tags,
        display_conditions: displayConditions,
        skip_logic: skipLogic,
        analytics_enabled: analyticsEnabled
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }

    // Update template's updated_at timestamp
    await supabase
      .from('survey_templates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId)

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

    // Check if template exists and user has permission
    const { data: template } = await supabase
      .from('survey_templates')
      .select('created_by, organization_id')
      .eq('id', templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Start transaction by deleting existing questions and inserting new ones
    const { error: deleteError } = await supabase
      .from('survey_template_questions')
      .delete()
      .eq('template_id', templateId)

    if (deleteError) {
      console.error('Database error deleting questions:', deleteError)
      return NextResponse.json({ error: 'Failed to update questions' }, { status: 500 })
    }

    // Insert new questions if any
    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, index) => ({
        template_id: templateId,
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
      }))

      const { error: insertError } = await supabase
        .from('survey_template_questions')
        .insert(questionsToInsert)

      if (insertError) {
        console.error('Database error inserting questions:', insertError)
        return NextResponse.json({ error: 'Failed to update questions' }, { status: 500 })
      }
    }

    // Update template's updated_at timestamp
    await supabase
      .from('survey_templates')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId)

    // Fetch and return updated questions
    const { data: updatedQuestions } = await supabase
      .from('survey_template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true })

    return NextResponse.json(updatedQuestions || [])

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}