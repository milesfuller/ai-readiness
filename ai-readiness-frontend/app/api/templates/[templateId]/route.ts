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

    // Get template with related data
    const { data: template, error } = await supabase
      .from('survey_templates')
      .select(`
        *,
        created_by_profile:profiles!survey_templates_created_by_fkey(
          first_name,
          last_name,
          avatar_url
        ),
        organization:organizations(
          name
        ),
        questions:survey_template_questions(
          *
        ),
        versions:survey_template_versions(
          id,
          version_number,
          version_notes,
          created_at,
          usage_count,
          completion_rate
        )
      `)
      .eq('id', templateId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Sort questions by order_index
    if (template.questions) {
      template.questions.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    // Sort versions by version number
    if (template.versions) {
      template.versions.sort((a: any, b: any) => b.version_number - a.version_number)
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

    // Check if user has permission to edit this template
    const { data: existingTemplate } = await supabase
      .from('survey_templates')
      .select('created_by, organization_id, published_at')
      .eq('id', templateId)
      .single()

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create version if this is a significant update
    if (versionNotes) {
      await supabase.rpc('create_template_version', {
        p_template_id: templateId,
        p_version_notes: versionNotes
      })
    }

    // Update template
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

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
        updateData.published_at = new Date().toISOString()
      } else if (status === 'archived') {
        updateData.archived_at = new Date().toISOString()
      }
    }

    const { data: template, error } = await supabase
      .from('survey_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

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

    // Check if template exists and user has permission
    const { data: template } = await supabase
      .from('survey_templates')
      .select('created_by, organization_id, status')
      .eq('id', templateId)
      .single()

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

    // Delete template (cascade will handle related records)
    const { error } = await supabase
      .from('survey_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}