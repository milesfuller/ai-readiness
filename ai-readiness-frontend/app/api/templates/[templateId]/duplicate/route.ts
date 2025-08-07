import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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

    // Check if source template exists and user has access
    const { data: sourceTemplate } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!sourceTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Use the duplicate_template function
    const { data: newTemplateId, error } = await supabase.rpc('duplicate_template', {
      p_template_id: templateId,
      p_new_title: title,
      p_organization_id: organizationId
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to duplicate template' }, { status: 500 })
    }

    // Fetch the new template with related data
    const { data: newTemplate } = await supabase
      .from('survey_templates')
      .select(`
        *,
        questions:survey_template_questions(*)
      `)
      .eq('id', newTemplateId)
      .single()

    return NextResponse.json(newTemplate, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}