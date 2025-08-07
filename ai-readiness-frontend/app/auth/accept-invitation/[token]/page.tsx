'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Lock, Loader2, CheckCircle2, AlertCircle, Building2, User, Mail } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { invitationClient } from '@/lib/services/invitation-client'

const acceptInvitationSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>

interface InvitationPageProps {
  params: {
    token: string
  }
}

export default function AcceptInvitationPage({ params }: InvitationPageProps) {
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema)
  })

  // Validate invitation on component mount
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        setLoading(true)
        setError(null)

        const validation = await invitationClient.validateInvitation(params.token)
        
        if (!validation.valid) {
          setError(validation.error || 'Invalid invitation')
          return
        }

        setInvitation(validation.invitation)
      } catch (err) {
        console.error('Error validating invitation:', err)
        setError('Failed to validate invitation')
      } finally {
        setLoading(false)
      }
    }

    validateInvitation()
  }, [params.token])

  const onSubmit = async (data: AcceptInvitationFormData) => {
    try {
      setSubmitting(true)
      setError(null)

      // Call API to accept invitation - this would need to be implemented
      const response = await fetch(`/api/invitations/accept/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password })
      })
      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to accept invitation')
        return
      }

      setSuccess(true)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthLayout title="Processing Invitation" subtitle="Please wait while we validate your invitation">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <p className="text-gray-400">Validating invitation...</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (error && !invitation) {
    return (
      <AuthLayout title="Invalid Invitation" subtitle="This invitation link is not valid">
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Invitation Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>This invitation may have:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Already been used</li>
                <li>Expired (invitations are valid for 7 days)</li>
                <li>Been cancelled by an administrator</li>
                <li>An invalid token</li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/login')}
              className="mt-6"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout title="Welcome!" subtitle="Your account has been created successfully">
        <Card className="glass-card border-green-500/20">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Account Created!</h3>
            <p className="text-gray-400 mb-6">
              Welcome to {invitation?.organizations?.name || 'the organization'}! 
              You'll be redirected to your dashboard shortly.
            </p>
            <div className="animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
              <span className="text-sm text-gray-400">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Accept Invitation"
      subtitle="Create your account to join the team"
    >
      <div className="space-y-6">
        {/* Invitation Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Building2 className="h-5 w-5 text-teal-400" />
              <span>Invitation Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Organization:</span>
                <span className="text-white font-medium">
                  {invitation?.organizations?.name || 'AI Readiness Platform'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{invitation?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Role:</span>
                <Badge variant="secondary" className="bg-teal-500/20 text-teal-400">
                  {invitation?.role === 'org_admin' ? 'Organization Administrator' : 'User'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Invited by:</span>
                <span className="text-white">
                  {invitation?.profiles?.first_name && invitation?.profiles?.last_name
                    ? `${invitation.profiles.first_name} ${invitation.profiles.last_name}`
                    : invitation?.profiles?.email || 'Administrator'
                  }
                </span>
              </div>
            </div>
            
            {invitation?.custom_message && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-gray-300 italic">
                  "{invitation.custom_message}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Create a password"
              leftIcon={Lock}
              variant="glass"
              error={errors.password?.message}
              {...register('password')}
            />
            {errors.password && (
              <div className="text-sm text-destructive">
                {errors.password.message}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Confirm your password"
              leftIcon={Lock}
              variant="glass"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <div className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>Password must contain:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Creating Account...' : 'Create Account & Join'}
          </Button>
        </form>

        {/* Security Notice */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-yellow-400 mb-1">Security Notice</p>
              <p>This invitation link can only be used once and will expire. If you already have an account with this email, please log in normally instead.</p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}