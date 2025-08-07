'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WhimsicalButton, SuccessCheckmark, FloatingHearts } from '@/components/ui/whimsy'
import { useAuth } from '@/lib/hooks/use-auth'
import { loginSchema, LoginFormData } from '@/lib/auth/schemas'

export default function LoginPage({
  searchParams
}: {
  searchParams?: { redirectTo?: string }
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHearts, setShowHearts] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const redirectTo = searchParams?.redirectTo || '/dashboard'

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
    setNetworkError(false)

    try {
      // Login attempt started
      const { error: authError } = await signIn(data.email, data.password)
      
      if (authError) {
        // eslint-disable-next-line no-console
        console.error('[Login Page] Login error:', authError)
        setError(authError.message)
      } else {
        // Login successful, showing success state
        setShowSuccess(true)
        setShowHearts(true)
        
        // Immediately redirect - cookies are now properly set via SSR client
        window.location.href = redirectTo
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[Login Page] Unexpected error:', err)
      
      // Check if it's a network error
      if (err.message?.includes('fetch') || err.message?.includes('network') || err.code === 'NETWORK_ERROR') {
        setNetworkError(true)
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your AI Readiness account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="login-form">
        {/* Error Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive" data-testid={networkError ? "network-error" : "login-error"} role="alert">
            {networkError ? <WifiOff className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
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
            data-testid="email-input"
            {...register('email')}
          />
          {errors.email && (
            <div className="text-sm text-destructive" data-testid="email-error" role="alert">
              {errors.email.message}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter your password"
            leftIcon={Lock}
            variant="glass"
            error={errors.password?.message}
            data-testid="password-input"
            {...register('password')}
          />
          {errors.password && (
            <div className="text-sm text-destructive" data-testid="password-error" role="alert">
              {errors.password.message}
            </div>
          )}
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
              className="w-full button-success"
              disabled
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Welcome back! Redirecting...</span>
              </div>
            </Button>
          ) : (
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
              loading={isLoading}
              data-testid="login-submit"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          )}
        </div>
        
        {/* Removed success hearts */}

        {/* Sign Up Link */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            {"Don&apos;t have an account?"}{' '}
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