'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WhimsicalButton, SuccessCheckmark, FloatingHearts } from '@/components/ui/whimsy'
import { useAuth } from '@/lib/hooks/use-auth'
import { loginSchema, LoginFormData } from '@/lib/auth/schemas'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHearts, setShowHearts] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit' // Only validate on submit, not on blur or change
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Auth] Starting login for:', data.email)
      const { error: authError } = await signIn(data.email, data.password)
      
      if (authError) {
        console.error('[Auth] Login error:', authError)
        setError(authError.message)
      } else {
        console.log('[Auth] Login successful, redirecting to dashboard...')
        setShowSuccess(true)
        setShowHearts(true)
        
        // Immediately redirect to prevent any unmounting issues
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('[Auth] Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your AI Readiness account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter your password"
            leftIcon={Lock}
            variant="glass"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500 focus:ring-2"
              {...register('rememberMe')}
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          
          <Link 
            href="/auth/reset-password" 
            className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <div className="relative">
          {showSuccess ? (
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full button-success animate-pulse"
              disabled
            >
              <div className="flex items-center space-x-2">
                <SuccessCheckmark show={true} size={16} />
                <span>Welcome back! Redirecting...</span>
              </div>
            </Button>
          ) : (
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full wobble-on-hover"
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          )}
        </div>
        
        {/* Success Hearts */}
        <FloatingHearts active={showHearts} count={6} />

        {/* Sign Up Link */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/auth/register" 
              className="text-teal-400 hover:text-teal-300 transition-colors font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}