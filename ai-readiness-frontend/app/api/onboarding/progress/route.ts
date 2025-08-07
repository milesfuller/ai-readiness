import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get onboarding progress from database
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error is ok
      console.error('Error fetching onboarding progress:', error)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    // If no progress found, create initial progress
    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from('onboarding_progress')
        .insert({
          user_id: user.id,
          current_step: 0,
          completed_steps: [],
          data: {},
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating onboarding progress:', createError)
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 })
      }

      return NextResponse.json(newProgress)
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Onboarding progress API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentStep, completedSteps, data: progressData } = body

    // Update onboarding progress
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        current_step: currentStep,
        completed_steps: completedSteps || [],
        data: progressData || {},
        started_at: new Date().toISOString() // Keep existing or set new
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating onboarding progress:', error)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Onboarding progress update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}