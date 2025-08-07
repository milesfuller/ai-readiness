'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MoreVertical,
  Copy,
  AlertCircle,
  Users,
  Calendar,
  Trash2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/lib/hooks/use-toast'
import { invitationClient, type InvitationData } from '@/lib/services/invitation-client'
import { useAuth } from '@/lib/hooks/use-auth'

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['user', 'org_admin']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  message: z.string().optional()
})

type InvitationFormData = z.infer<typeof invitationSchema>

interface InvitationManagementProps {
  organizationId?: string
}

export function InvitationManagement({ organizationId }: InvitationManagementProps) {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, expired: 0, recent: [] })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      role: 'user'
    }
  })

  // Load invitations and stats
  useEffect(() => {
    loadInvitations()
  }, [organizationId])

  const loadInvitations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const invitationStats = await invitationClient.getInvitations()
      setStats(invitationStats)
      setInvitations(invitationStats.recent)
    } catch (err) {
      console.error('Error loading invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: InvitationFormData) => {
    if (!user || !user.organizationId) {
      toast({
        title: "Error",
        description: "You must be part of an organization to send invitations",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      
      const invitationData: InvitationData = {
        email: data.email,
        organizationId: organizationId || user.organizationId,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        message: data.message
      }

      const result = await invitationClient.sendInvitation(invitationData)
      
      if (result.success) {
        toast({
          title: "Invitation Sent!",
          description: `Invitation sent successfully to ${data.email}`,
        })
        
        reset()
        setShowInviteDialog(false)
        loadInvitations() // Refresh the list
      } else {
        // Check if it's a fallback error with manual link
        if (result.error?.includes('Manual link:') || result.error?.includes('share this link manually:')) {
          const linkMatch = result.error.match(/(https?:\/\/[^\s]+)/)
          if (linkMatch) {
            navigator.clipboard.writeText(linkMatch[1])
            toast({
              title: "Email Service Unavailable",
              description: "Invitation link copied to clipboard. Please share manually.",
            })
          }
        } else {
          toast({
            title: "Failed to Send Invitation",
            description: result.error || "Unknown error occurred",
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const result = await invitationClient.resendInvitation(invitationId)
      
      if (result.success) {
        toast({
          title: "Invitation Resent",
          description: "The invitation has been sent again",
        })
      } else {
        // Handle fallback case
        if (result.error?.includes('Manual link:')) {
          const linkMatch = result.error.match(/(https?:\/\/[^\s]+)/)
          if (linkMatch) {
            navigator.clipboard.writeText(linkMatch[1])
            toast({
              title: "Email Service Unavailable",
              description: "Invitation link copied to clipboard",
            })
          }
        } else {
          toast({
            title: "Failed to Resend",
            description: result.error,
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      })
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const result = await invitationClient.deleteInvitation(invitationId)
      
      if (result.success) {
        toast({
          title: "Invitation Cancelled",
          description: "The invitation has been cancelled",
        })
        loadInvitations() // Refresh the list
      } else {
        toast({
          title: "Failed to Cancel",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      })
    }
  }

  const copyInvitationLink = async (token: string) => {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation/${token}`
    try {
      await navigator.clipboard.writeText(link)
      toast({
        title: "Link Copied",
        description: "Invitation link copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to Copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string, expiresAt: string) => {
    if (status === 'accepted') return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (status === 'cancelled') return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (new Date(expiresAt) < new Date()) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  const getStatusText = (status: string, expiresAt: string) => {
    if (status === 'accepted') return 'Accepted'
    if (status === 'cancelled') return 'Cancelled'
    if (new Date(expiresAt) < new Date()) return 'Expired'
    return 'Pending'
  }

  const getStatusIcon = (status: string, expiresAt: string) => {
    if (status === 'accepted') return <CheckCircle2 className="h-3 w-3" />
    if (status === 'cancelled') return <XCircle className="h-3 w-3" />
    if (new Date(expiresAt) < new Date()) return <Clock className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Invitations</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={loadInvitations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Invitations</h2>
          <p className="text-gray-400">Invite new members to join your organization</p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    leftIcon={Mail}
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First name (optional)"
                    {...register('firstName')}
                  />
                  <Input
                    placeholder="Last name (optional)"
                    {...register('lastName')}
                  />
                </div>

                <div className="space-y-2">
                  <Select 
                    value={watch('role')} 
                    onValueChange={(value) => register('role').onChange({ target: { value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="org_admin">Organization Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Personal message (optional)"
                    rows={3}
                    {...register('message')}
                  />
                  <p className="text-xs text-gray-500">
                    Add a personal message to make the invitation more welcoming
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.accepted}</p>
                <p className="text-sm text-gray-400">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.expired}</p>
                <p className="text-sm text-gray-400">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Invitations</CardTitle>
              <CardDescription>Manage and track invitation status</CardDescription>
            </div>
            <Button variant="outline" onClick={loadInvitations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Invitations Yet</h3>
              <p className="text-gray-400 mb-4">
                Send your first invitation to start building your team
              </p>
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Send First Invitation
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Recipient</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Sent</TableHead>
                  <TableHead className="text-gray-300">Expires</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id} className="border-gray-700">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">
                          {invitation.first_name && invitation.last_name
                            ? `${invitation.first_name} ${invitation.last_name}`
                            : invitation.email
                          }
                        </p>
                        {invitation.first_name && (
                          <p className="text-sm text-gray-400">{invitation.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-teal-500/20 text-teal-400">
                        {invitation.role === 'org_admin' ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invitation.status, invitation.expires_at)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(invitation.status, invitation.expires_at)}
                          <span>{getStatusText(invitation.status, invitation.expires_at)}</span>
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-300">
                        {formatDate(invitation.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-300">
                        {formatDate(invitation.expires_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyInvitationLink(invitation.token)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          {invitation.status === 'pending' && new Date(invitation.expires_at) > new Date() && (
                            <>
                              <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}