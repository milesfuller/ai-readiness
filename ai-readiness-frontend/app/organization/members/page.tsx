'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from '@/components/ui'
import { Users, Mail, UserPlus, Shield, Trash2 } from 'lucide-react'

export default function OrganizationMembersPage() {
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [organization, setOrganization] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    setUser(user)

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organizationId, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organizationId) return

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organizationId)
      .single()

    setOrganization(org)

    // Get all members
    const { data: orgMembers } = await supabase
      .from('users')
      .select('*')
      .eq('organizationId', userData.organizationId)

    setMembers(orgMembers || [])
  }

  const handleInvite = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Create invitation record
    const { error } = await supabase
      .from('invitations')
      .insert({
        email: inviteEmail,
        role: inviteRole,
        organizationId: organization.id,
        invitedBy: user.id,
        status: 'pending'
      })

    if (error) {
      alert('Failed to send invitation')
    } else {
      // In a real app, this would send an email
      alert(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      
      // Add to members list as pending
      setMembers([...members, {
        email: inviteEmail,
        role: inviteRole,
        firstName: 'Pending',
        lastName: 'Invitation',
        status: 'pending'
      }])
    }
    setLoading(false)
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ 
        organizationId: null,
        role: 'user'
      })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.filter(m => m.id !== memberId))
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.map(m => 
        m.id === memberId ? {...m, role: newRole} : m
      ))
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const userRole = members.find(m => m.id === user.id)?.role

  return (
    <MainLayout user={user} currentPath="/organization/members">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your organization's members and permissions
            </p>
          </div>
          {organization && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-semibold">{organization.name}</p>
            </div>
          )}
        </div>

        {/* Invite New Member */}
        {(userRole === 'org_admin' || userRole === 'system_admin') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                  />
                </div>
                <div className="w-48">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="org_admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleInvite}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Invite
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id || member.email}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                        {member.status === 'pending' && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Pending
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {userRole === 'org_admin' && member.id !== user.id ? (
                        <select
                          className="px-2 py-1 border rounded text-sm"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="org_admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-sm capitalize">{member.role}</span>
                      )}
                    </div>
                    
                    {userRole === 'org_admin' && member.id !== user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}