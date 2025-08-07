'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button, ButtonProps } from './button'
import { CheckCircle2, Heart, Sparkles, TrendingUp, Loader2, Zap, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

// Animated Counter Component
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const requestRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    setIsAnimating(true)
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const progress = (timestamp - startTimeRef.current) / duration

      if (progress < 1) {
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.floor(value * easeOutCubic))
        requestRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
      }
    }

    requestRef.current = requestAnimationFrame(animate)

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [value, duration])

  return (
    <span className={cn('font-bold tabular-nums', isAnimating && 'animate-pulse', className)}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// Whimsical Button Component
interface WhimsicalButtonProps extends ButtonProps {
  isLoading?: boolean
  successState?: boolean
  celebrateOnClick?: boolean
}

export const WhimsicalButton: React.FC<WhimsicalButtonProps> = ({
  children,
  isLoading = false,
  successState = false,
  celebrateOnClick = false,
  className,
  onClick,
  ...props
}) => {
  const [isClicked, setIsClicked] = useState(false)
  const [showHearts, setShowHearts] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (celebrateOnClick) {
      setIsClicked(true)
      setShowHearts(true)
      setTimeout(() => {
        setIsClicked(false)
        setShowHearts(false)
      }, 1000)
    }
    onClick?.(e)
  }

  return (
    <div className="relative inline-block">
      <Button
        className={cn(
          'transition-all duration-300 hover:scale-105',
          isClicked && 'animate-bounce scale-110',
          successState && 'bg-green-600 hover:bg-green-700',
          className
        )}
        onClick={handleClick}
        disabled={isLoading || successState}
        {...props}
      >
        {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
        {successState ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Success!
          </>
        ) : (
          children
        )}
      </Button>
      
      {showHearts && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <Heart
              key={i}
              className={`absolute h-4 w-4 text-pink-500 animate-bounce`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Success Checkmark Component
interface SuccessCheckmarkProps {
  show: boolean
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({
  show,
  size = 'md',
  className = ''
}) => {
  const getSizeClass = (): string => {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    }
    return typeof size === 'number' ? '' : sizeClasses[size]
  }
  
  const getSizeStyle = () => {
    return typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined
  }

  if (!show) return null

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <CheckCircle2 
        className={cn(
          'text-green-500 animate-in zoom-in duration-500',
          getSizeClass()
        )}
        style={getSizeStyle()}
      />
    </div>
  )
}

// Floating Hearts Component
interface FloatingHeartsProps {
  show: boolean
  count?: number
  duration?: number
  className?: string
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({
  show,
  count = 3,
  duration = 2000,
  className = ''
}) => {
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    if (show) {
      const newHearts = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100
      }))
      setHearts(newHearts)

      const timer = setTimeout(() => {
        setHearts([])
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setHearts([])
    }
    
    return undefined
  }, [show, count, duration])

  if (!show || hearts.length === 0) return null

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {hearts.map((heart) => (
        <Heart
          key={heart.id}
          className="absolute h-6 w-6 text-pink-500 animate-bounce"
          style={{
            left: `${heart.x}%`,
            top: `${heart.y}%`,
            animationDuration: `${1 + Math.random()}s`
          }}
        />
      ))}
    </div>
  )
}

// Confetti Component
interface ConfettiProps {
  show: boolean
  duration?: number
  particleCount?: number
  className?: string
}

export const Confetti: React.FC<ConfettiProps> = ({
  show,
  duration = 3000,
  particleCount = 50,
  className = ''
}) => {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    color: string
    size: number
    speedX: number
    speedY: number
  }>>([])

  useEffect(() => {
    if (show) {
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 100,
        speedY: (Math.random() - 0.5) * 100
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        setParticles([])
      }, duration)

      return () => clearTimeout(timer)
    }
    
    return undefined
  }, [show, particleCount, duration])

  if (!show || particles.length === 0) return null

  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden z-50', className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDuration: `${1 + Math.random()}s`,
            animationDelay: `${Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  )
}

// Typewriter Component
interface TypewriterProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 50,
  className = '',
  onComplete
}) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (onComplete) {
      onComplete()
    }
    
    return undefined
  }, [currentIndex, text, speed, onComplete])

  return (
    <span className={cn('font-mono', className)}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  )
}

// Whimsical Loading Component
interface WhimsicalLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const WhimsicalLoading: React.FC<WhimsicalLoadingProps> = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}) => {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.'
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <div className="flex space-x-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-blue-500 animate-bounce',
              sizeClasses[size]
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
      <div className="text-center text-gray-600 dark:text-gray-400">
        {message}{dots}
      </div>
    </div>
  )
}

// Progress Milestone Component
interface ProgressMilestoneProps {
  current: number
  total: number
  milestones?: number[]
  showCelebration?: boolean
  className?: string
}

export const ProgressMilestone: React.FC<ProgressMilestoneProps> = ({
  current,
  total,
  milestones = [25, 50, 75, 100],
  showCelebration = true,
  className = ''
}) => {
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null)
  const progress = Math.round((current / total) * 100)

  useEffect(() => {
    const reachedMilestone = milestones.find(m => 
      progress >= m && progress < m + 5 // Only celebrate when just reached
    )

    if (reachedMilestone && showCelebration) {
      setCelebratingMilestone(reachedMilestone)
      setTimeout(() => setCelebratingMilestone(null), 2000)
    }
  }, [progress, milestones, showCelebration])

  return (
    <div className={cn('relative', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Progress: {current} of {total}
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {progress}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 relative overflow-hidden">
        <div 
          className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
        
        {/* Milestone markers */}
        {milestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 h-3 w-0.5 bg-gray-400"
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>

      {celebratingMilestone && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>{celebratingMilestone}% Complete!</span>
          </div>
          <Confetti show={true} duration={1500} particleCount={20} />
        </div>
      )}
    </div>
  )
}

// Konami Code Hook
export const useKonamiCode = (callback: () => void) => {
  const [keySequence, setKeySequence] = useState<string[]>([])

  useEffect(() => {
    const konamiCode = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA'
    ]
    
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeySequence(prev => {
        const newSequence = [...prev, event.code]
        
        // Keep only the last 10 keys
        if (newSequence.length > 10) {
          newSequence.shift()
        }
        
        // Check if the sequence matches the Konami code
        if (newSequence.length === konamiCode.length) {
          const matches = konamiCode.every((code, index) => 
            code === newSequence[index]
          )
          
          if (matches) {
            callback()
            return [] // Reset sequence
          }
        }
        
        return newSequence
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callback])

  return keySequence
}