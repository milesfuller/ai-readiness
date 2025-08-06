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

  // Use real user data, fallback to mock for missing fields
  const userData = {
    id: user.id,
    email: user.email || mockUser.email,
    role: mockUser.role, // Would come from user metadata in production
    organizationId: mockUser.organizationId,
    profile: {
      ...mockUser.profile,
      userId: user.id,
      // Override with real user data if available
      firstName: user.user_metadata?.firstName || mockUser.profile.firstName,
      lastName: user.user_metadata?.lastName || mockUser.profile.lastName,
    },
    createdAt: user.created_at || mockUser.createdAt,
    updatedAt: user.updated_at || mockUser.updatedAt,
    lastLogin: new Date().toISOString()
  }

  return <DashboardClient user={userData} />
}