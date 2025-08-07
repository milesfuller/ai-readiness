'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertTriangle,
  CheckCircle,
  User,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Building2
} from 'lucide-react'
import { User as UserType, UserRole } from '@/lib/types'

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (user: UserType) => void
  organizationId?: string
}

interface UserEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (user: UserType) => void
  user: UserType | null
}

interface UserSuspendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: UserType | null
  action: 'suspend' | 'reactivate'
}

interface BulkUserActionsProps {
  selectedUsers: UserType[]
  onAction: (action: string, users: UserType[]) => void
  onClearSelection: () => void
}

// User Create Dialog
export function UserCreateDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  organizationId 
}: UserCreateDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user' as UserRole,
    department: '',
    jobTitle: '',
    sendWelcomeEmail: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // This would call the actual API to create a user
      const newUser: UserType = {
        id: `user-${Date.now()}`,
        email: formData.email,
        role: formData.role,
        organizationId,
        profile: {
          id: `profile-${Date.now()}`,
          userId: `user-${Date.now()}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          jobTitle: formData.jobTitle,
          preferences: {
            theme: 'dark',
            notifications: true,
            voiceInput: false,
            language: 'en'
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      onSuccess(newUser)
      onOpenChange(false)
      
      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        department: '',
        jobTitle: '',
        sendWelcomeEmail: true
      })
    } catch (error) {
      console.error('Failed to create user:', error)
      setError(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Create New User</span>
            </DialogTitle>
            <DialogDescription>
              Add a new user to the organization with appropriate role and permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@company.com"
                required
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-gray-300">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>User</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="org_admin">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4" />
                        <span>Organization Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system_admin">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>System Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department" className="text-gray-300">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Engineering"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jobTitle" className="text-gray-300">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Senior Developer"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendWelcomeEmail"
                checked={formData.sendWelcomeEmail}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendWelcomeEmail: !!checked }))}
              />
              <Label htmlFor="sendWelcomeEmail" className="text-gray-300 text-sm">
                Send welcome email with login instructions
              </Label>
            </div>

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.email.trim() || !formData.firstName.trim()}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// User Edit Dialog
export function UserEditDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  user 
}: UserEditDialogProps) {
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    role: user?.role || 'user' as UserRole,
    department: user?.profile?.department || '',
    jobTitle: user?.profile?.jobTitle || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        role: user.role,
        department: user.profile?.department || '',
        jobTitle: user.profile?.jobTitle || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const updatedUser: UserType = {
        ...user,
        role: formData.role,
        profile: {
          ...user.profile!,
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          jobTitle: formData.jobTitle
        },
        updatedAt: new Date().toISOString()
      }

      onSuccess(updatedUser)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update user:', error)
      setError(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Edit User</span>
            </DialogTitle>
            <DialogDescription>
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Email (cannot be changed)</div>
              <div className="text-white font-medium">{user?.email}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-gray-300">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="org_admin">Organization Admin</SelectItem>
                    <SelectItem value="system_admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department" className="text-gray-300">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jobTitle" className="text-gray-300">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// User Suspend Dialog
export function UserSuspendDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  user,
  action 
}: UserSuspendDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const handleAction = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // This would call the actual API to suspend/reactivate user
      console.log(`${action} user:`, user.id, 'reason:', reason)
      
      onSuccess()
      onOpenChange(false)
      setReason('')
    } catch (error) {
      console.error(`Failed to ${action} user:`, error)
      setError(error instanceof Error ? error.message : `Failed to ${action} user`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const isDeactivation = action === 'suspend'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isDeactivation ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'
            }`}>
              {isDeactivation ? (
                <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-white">
                {isDeactivation ? 'Suspend User' : 'Reactivate User'}
              </DialogTitle>
              <DialogDescription>
                {isDeactivation 
                  ? 'This will prevent the user from accessing the system.'
                  : 'This will restore the user\'s access to the system.'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">User:</p>
              <p className="font-medium text-white">
                {user.profile?.firstName} {user.profile?.lastName}
              </p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-gray-300">
                Reason {isDeactivation ? '(required)' : '(optional)'}
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isDeactivation ? 'Policy violation, security concerns, etc.' : 'Issue resolved, reinstatement approved, etc.'}
                className="bg-gray-800 border-gray-600 text-white"
                required={isDeactivation}
              />
            </div>

            {isDeactivation && (
              <Card className="border-yellow-500 bg-yellow-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-400 mb-1">Warning</p>
                      <p className="text-yellow-300">
                        The user will be immediately logged out and cannot access the system until reactivated.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDeactivation ? "destructive" : "default"}
            onClick={handleAction}
            disabled={loading || (isDeactivation && !reason.trim())}
          >
            {loading ? (isDeactivation ? 'Suspending...' : 'Reactivating...') : (isDeactivation ? 'Suspend User' : 'Reactivate User')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Bulk User Actions
export function BulkUserActions({ 
  selectedUsers, 
  onAction, 
  onClearSelection 
}: BulkUserActionsProps) {
  if (selectedUsers.length === 0) return null

  return (
    <Card className="glass-card border-teal-500/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-teal-400" />
            <span className="text-white font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('export', selectedUsers)}
            >
              Export Selected
            </Button>
            
            <Select onValueChange={(value) => onAction(value, selectedUsers)}>
              <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                <SelectValue placeholder="Bulk Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="change_role">Change Role</SelectItem>
                <SelectItem value="change_department">Change Department</SelectItem>
                <SelectItem value="suspend">Suspend Users</SelectItem>
                <SelectItem value="send_email">Send Email</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-gray-400 hover:text-white"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}