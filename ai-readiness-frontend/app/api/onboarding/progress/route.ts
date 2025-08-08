import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createUserProfileService } from '@/services/database/user-profile.service'

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use UserProfileService to get onboarding progress
    const userProfileService = createUserProfileService()
    const progress = await userProfileService.getOnboardingProgress(user.id)
    
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

    // Use UserProfileService to update onboarding progress
    const userProfileService = createUserProfileService()
    const progress = await userProfileService.updateOnboardingProgress(
      user.id,
      currentStep,
      progressData
    )

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Onboarding progress update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}