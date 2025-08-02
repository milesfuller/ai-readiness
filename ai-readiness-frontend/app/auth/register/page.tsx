'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Building, AlertCircle, CheckCircle } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/use-auth'
import { registerSchema, RegisterFormData } from '@/lib/auth/schemas'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const metadata = {
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          organizationName: data.organizationName
        }
      }

      const { error: authError } = await signUp(data.email, data.password, metadata)
      
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/verify-email')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout
        title="Account Created!"
        subtitle="Check your email to verify your account"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-muted-foreground">
            We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
          </p>
          <Button
            variant="ghost"
            onClick={() => router.push('/auth/login')}
            className="w-full"
          >
            Return to Sign In
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join AI Readiness Assessment platform"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="First name"
            leftIcon={User}
            variant="glass"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            type="text"
            placeholder="Last name"
            leftIcon={User}
            variant="glass"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Enter your email"
            leftIcon={Mail}
            variant="glass"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Organization Field */}
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Organization name (optional)"
            leftIcon={Building}
            variant="glass"
            error={errors.organizationName?.message}
            {...register('organizationName')}
          />
        </div>

        {/* Password Fields */}
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Create password"
            leftIcon={Lock}
            variant="glass"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            leftIcon={Lock}
            variant="glass"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
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

        {/* Terms & Privacy */}
        <div className="text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-teal-400 hover:text-teal-300">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-teal-400 hover:text-teal-300">
            Privacy Policy
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>

        {/* Sign In Link */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}