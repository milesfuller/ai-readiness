'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/use-auth'
import { 
  resetPasswordSchema, 
  ResetPasswordFormData, 
  newPasswordSchema, 
  NewPasswordFormData 
} from '@/lib/auth/schemas'

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isNewPassword, setIsNewPassword] = useState(false)
  const { resetPassword, updatePassword } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if this is a password reset callback (has access_token)
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    if (accessToken) {
      setIsNewPassword(true)
    }
  }, [searchParams])

  // Form for requesting password reset
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: errorsReset }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  })

  // Form for setting new password
  const {
    register: registerNew,
    handleSubmit: handleSubmitNew,
    formState: { errors: errorsNew }
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema)
  })

  const onSubmitReset = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await resetPassword(data.email)
      
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitNew = async (data: NewPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await updatePassword(data.password)
      
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state for email sent
  if (success && !isNewPassword) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="Password reset instructions sent"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-teal-400" />
          </div>
          <p className="text-muted-foreground">
            We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Back to Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => setSuccess(false)}
              className="w-full"
            >
              Resend Email
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Success state for password updated
  if (success && isNewPassword) {
    return (
      <AuthLayout
        title="Password Updated!"
        subtitle="Your password has been successfully changed"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-muted-foreground">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Button
            onClick={() => router.push('/auth/login')}
            className="w-full"
          >
            Continue to Sign In
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // New password form
  if (isNewPassword) {
    return (
      <AuthLayout
        title="Set New Password"
        subtitle="Enter your new password below"
      >
        <form onSubmit={handleSubmitNew(onSubmitNew)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Password Fields */}
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              leftIcon={Lock}
              variant="glass"
              error={errorsNew.password?.message}
              {...registerNew('password')}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              leftIcon={Lock}
              variant="glass"
              error={errorsNew.confirmPassword?.message}
              {...registerNew('confirmPassword')}
            />
          </div>

          {/* Password Requirements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Password must contain:</p>
            <ul className="ml-4 space-y-1">
              <li>• At least 6 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One number</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Updating password...' : 'Update Password'}
          </Button>
        </form>
      </AuthLayout>
    )
  }

  // Reset password request form
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email to receive reset instructions"
    >
      <form onSubmit={handleSubmitReset(onSubmitReset)} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Enter your email"
            leftIcon={Mail}
            variant="glass"
            error={errorsReset.email?.message}
            {...registerReset('email')}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? 'Sending instructions...' : 'Send Reset Instructions'}
        </Button>

        {/* Back to Sign In */}
        <div className="text-center pt-4">
          <Link 
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}