'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

function VerifyEmailContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for verification tokens on mount
  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      if (token && type === 'signup') {
        setVerifying(true)
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          })

          if (error) {
            setError(error.message)
          } else {
            setSuccess(true)
            setTimeout(() => {
              router.push('/dashboard')
            }, 3000)
          }
        } catch (err) {
          setError('Failed to verify email. Please try again.')
        } finally {
          setVerifying(false)
        }
      }
    }

    handleEmailVerification()
  }, [searchParams, router])

  const resendVerification = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Note: This would typically require the user's email
      // In a real app, you might store it in localStorage or session
      const email = localStorage.getItem('pendingVerificationEmail')
      
      if (!email) {
        setError('No email found for verification. Please register again.')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) {
        setError(error.message)
      } else {
        // Show success message briefly
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Verification in progress
  if (verifying) {
    return (
      <AuthLayout
        title="Verifying Email"
        subtitle="Please wait while we verify your email address"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
          </div>
          <p className="text-muted-foreground">
            Verifying your email address...
          </p>
        </div>
      </AuthLayout>
    )
  }

  // Verification successful
  if (success && !error) {
    return (
      <AuthLayout
        title="Email Verified!"
        subtitle="Your account has been successfully verified"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-muted-foreground">
            Your email has been verified successfully. You will be redirected to the dashboard shortly.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            Continue to Dashboard
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // Default state - waiting for verification
  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Check your inbox and click the verification link"
    >
      <div className="text-center space-y-6">
        {/* Email Icon */}
        <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-teal-400" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-muted-foreground">
            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </p>
          <p className="text-sm text-muted-foreground">
            Don't see the email? Check your spam folder or click the button below to resend.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={resendVerification}
            variant="outline"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Resending...' : 'Resend Verification Email'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/auth/login')}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </div>

        {/* Help */}
        <div className="text-xs text-muted-foreground">
          <p>
            Having trouble?{' '}
            <Link href="/support" className="text-teal-400 hover:text-teal-300">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <AuthLayout
        title="Loading..."
        subtitle="Please wait"
      >
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-teal-400 animate-spin mx-auto" />
        </div>
      </AuthLayout>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}