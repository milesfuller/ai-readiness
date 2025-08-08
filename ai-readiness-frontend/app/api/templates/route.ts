import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SurveyTemplate, TemplateFilters } from '@/lib/types'
import { createSurveyTemplateService } from '@/services/database/survey-template.service'

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

    // Use SurveyTemplateService to list templates with filters
    const surveyTemplateService = createSurveyTemplateService()
    
    // Convert filters to service format
    const serviceOptions = {
      search: filters.search,
      category: filters.category,
      status: filters.status,
      visibility: filters.visibility,
      tags: filters.tags,
      limit: pageSize,
      offset
    }

    const { templates, total: totalCount } = await surveyTemplateService.listTemplates(serviceOptions)

    return NextResponse.json({
      data: templates,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
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

    // Use SurveyTemplateService to create template
    const surveyTemplateService = createSurveyTemplateService()
    
    const template = await surveyTemplateService.createTemplate({
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
      organization_id: organizationId || null
    }, user.id)

    return NextResponse.json(template, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}