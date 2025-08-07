'use client'

import React from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { InvitationManagement } from '@/components/admin/invitation-management'

export default function InvitationsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <InvitationManagement organizationId={user?.organizationId} />
    </div>
  )
}