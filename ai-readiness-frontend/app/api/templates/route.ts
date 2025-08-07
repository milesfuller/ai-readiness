import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SurveyTemplate, TemplateFilters } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: TemplateFilters = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') as any || undefined,
      status: searchParams.get('status') || undefined,
      visibility: searchParams.get('visibility') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      rating: searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : undefined,
      difficultyLevel: searchParams.get('difficultyLevel') ? parseInt(searchParams.get('difficultyLevel')!) : undefined,
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '12')
    const offset = (page - 1) * pageSize

    // Get user for access control
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
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
        question_count:survey_template_questions(count)
      `)

    // Apply filters
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }
    
    if (filters.difficultyLevel) {
      query = query.eq('difficulty_level', filters.difficultyLevel)
    }

    // Apply sorting and pagination
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data: templates, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('survey_templates')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      data: templates || [],
      pagination: {
        page,
        pageSize,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      category,
      visibility = 'private',
      estimatedDuration = 10,
      difficultyLevel = 1,
      tags = [],
      introductionText,
      conclusionText,
      settings = {},
      organizationId
    } = body

    // Validate required fields
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category' },
        { status: 400 }
      )
    }

    // Default settings
    const defaultSettings = {
      allowAnonymous: true,
      requireAllQuestions: false,
      voiceEnabled: true,
      aiAnalysisEnabled: false,
      randomizeQuestions: false,
      showProgressBar: true,
      allowSkipQuestions: false,
      saveProgress: true,
      customBranding: {}
    }

    const { data: template, error } = await supabase
      .from('survey_templates')
      .insert({
        title,
        description,
        category,
        visibility,
        estimated_duration: estimatedDuration,
        difficulty_level: difficultyLevel,
        tags,
        introduction_text: introductionText,
        conclusion_text: conclusionText,
        settings: { ...defaultSettings, ...settings },
        created_by: user.id,
        organization_id: organizationId || null,
        marketplace_data: {
          price: 0,
          downloads: 0,
          rating: 0,
          reviews: 0,
          featured: false,
          license: 'standard'
        },
        question_groups: []
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}