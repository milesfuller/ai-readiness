import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update onboarding progress to complete
    const { error: progressError } = await supabase
      .from('onboarding_progress')
      .update({
        completed_at: new Date().toISOString(),
        current_step: -1 // Mark as complete
      })
      .eq('user_id', user.id)

    if (progressError) {
      console.error('Error completing onboarding progress:', progressError)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    // Update user metadata to mark onboarding as complete
    const { error: userError } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true
      }
    })

    if (userError) {
      console.error('Error updating user metadata:', userError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Complete onboarding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}