import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

// Mock user data for demonstration
const mockUser = {
  id: '1',
  email: 'john.doe@company.com',
  role: 'org_admin' as const,
  organizationId: 'org-1',
  profile: {
    id: 'profile-1',
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    avatar: undefined,
    department: 'IT Leadership',
    jobTitle: 'Director of Technology',
    preferences: {
      theme: 'dark' as const,
      notifications: true,
      voiceInput: true,
      language: 'en'
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-08-01T00:00:00Z',
  lastLogin: '2024-08-02T19:00:00Z'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <DashboardClient user={mockUser} />
}