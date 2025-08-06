'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Heart, Star, Zap } from 'lucide-react'

// Confetti Component for celebrations
interface ConfettiProps {
  active: boolean
  duration?: number
  colors?: string[]
  intensity?: 'low' | 'medium' | 'high'
}

export const Confetti: React.FC<ConfettiProps> = ({ 
  active, 
  duration = 3000, 
  colors = ['#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  intensity = 'medium'
}) => {
  const [pieces, setPieces] = useState<Array<{
    id: string
    x: number
    y: number
    color: string
    size: number
    rotation: number
    delay: number
  }>>([])

  useEffect(() => {
    if (!active) {
      setPieces([])
      return
    }

    const pieceCount = intensity === 'low' ? 50 : intensity === 'medium' ? 100 : 150
    const newPieces = Array.from({ length: pieceCount }, (_, i) => ({
      id: `confetti-${i}`,
      x: Math.random() * 100,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      delay: Math.random() * 1000
    }))

    setPieces(newPieces)

    const timer = setTimeout(() => {
      setPieces([])
    }, duration)

    return () => clearTimeout(timer)
  }, [active, duration, colors, intensity])

  if (typeof window === 'undefined' || !active) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}ms`,
            borderRadius: Math.random() > 0.3 ? '50%' : '2px'
          }}
        />
      ))}
    </div>,
    document.body
  )
}

// Success checkmark animation
interface SuccessCheckmarkProps {
  show: boolean
  size?: number
  color?: string
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({ 
  show, 
  size = 64, 
  color = '#10b981' 
}) => {
  if (!show) return null

  return (
    <div className="success-pulse inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-in zoom-in-50 duration-500"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={color}
          className="opacity-20"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-in draw-in duration-700 delay-200"
          style={{
            strokeDasharray: '10',
            strokeDashoffset: '10',
            animation: 'draw-in 0.7s ease-out 0.2s forwards'
          }}
        />
      </svg>
    </div>
  )
}

// Floating hearts for special moments
interface FloatingHeartsProps {
  active: boolean
  count?: number
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ active, count = 5 }) => {
  const [hearts, setHearts] = useState<Array<{
    id: string
    x: number
    delay: number
    color: string
  }>>([])

  useEffect(() => {
    if (!active) {
      setHearts([])
      return
    }

    const heartColors = ['#ec4899', '#f472b6', '#f9a8d4', '#fce7f3']
    const newHearts = Array.from({ length: count }, (_, i) => ({
      id: `heart-${i}`,
      x: 20 + Math.random() * 60,
      delay: i * 200,
      color: heartColors[Math.floor(Math.random() * heartColors.length)]
    }))

    setHearts(newHearts)

    const timer = setTimeout(() => {
      setHearts([])
    }, 3000)

    return () => clearTimeout(timer)
  }, [active, count])

  if (!active) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="floating-hearts absolute bottom-10"
          style={{
            left: `${heart.x}%`,
            animationDelay: `${heart.delay}ms`,
            color: heart.color
          }}
        >
          <Heart className="w-6 h-6 fill-current" />
        </div>
      ))}
    </div>
  )
}

// Progress milestone celebration
interface ProgressMilestoneProps {
  progress: number
  milestones?: number[]
  onMilestone?: (milestone: number) => void
}

export const ProgressMilestone: React.FC<ProgressMilestoneProps> = ({ 
  progress, 
  milestones = [25, 50, 75, 100],
  onMilestone
}) => {
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set())
  const [showSparkles, setShowSparkles] = useState(false)

  useEffect(() => {
    milestones.forEach(milestone => {
      if (progress >= milestone && !celebratedMilestones.has(milestone)) {
        setCelebratedMilestones(prev => new Set([...prev, milestone]))
        setShowSparkles(true)
        onMilestone?.(milestone)
        
        setTimeout(() => setShowSparkles(false), 2000)
      }
    })
  }, [progress, milestones, celebratedMilestones, onMilestone])

  return (
    <>
      {showSparkles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="progress-sparkle absolute"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 100}ms`
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// Loading messages with personality
const LOADING_MESSAGES = [
  "Brewing some AI magic...",
  "Teaching robots to be helpful...",
  "Consulting the digital oracle...",
  "Calibrating the smart meters...",
  "Arranging pixels just right...",
  "Summoning the data spirits...",
  "Polishing the algorithms...",
  "Charging the creativity batteries...",
  "Aligning the digital stars...",
  "Optimizing for maximum awesomeness..."
]

interface WhimsicalLoadingProps {
  messages?: string[]
  interval?: number
}

export const WhimsicalLoading: React.FC<WhimsicalLoadingProps> = ({ 
  messages = LOADING_MESSAGES,
  interval = 2000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, interval)

    return () => clearInterval(timer)
  }, [messages.length, interval])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        {messages[currentIndex]}
      </p>
    </div>
  )
}

// Button with success state
interface WhimsicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showSuccess?: boolean
  successDuration?: number
  onSuccessComplete?: () => void
  children: React.ReactNode
}

export const WhimsicalButton: React.FC<WhimsicalButtonProps> = ({
  showSuccess = false,
  successDuration = 2000,
  onSuccessComplete,
  children,
  className = '',
  ...props
}) => {
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (showSuccess) {
      setIsSuccess(true)
      const timer = setTimeout(() => {
        setIsSuccess(false)
        onSuccessComplete?.()
      }, successDuration)
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [showSuccess, successDuration, onSuccessComplete])

  return (
    <button
      {...props}
      className={`${className} ${isSuccess ? 'button-success' : ''} wobble-on-hover`}
    >
      {isSuccess ? (
        <div className="flex items-center space-x-2">
          <SuccessCheckmark show={true} size={16} />
          <span>Success!</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// Easter egg detection hook
export const useKonamiCode = (callback: () => void) => {
  const [sequence, setSequence] = useState<string[]>([])
  const konamiCode = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ]

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setSequence(prev => {
      const newSequence = [...prev, event.code].slice(-konamiCode.length)
      
      if (newSequence.join(',') === konamiCode.join(',')) {
        callback()
        return []
      }
      
      return newSequence
    })
  }, [callback, konamiCode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Number counter animation
interface AnimatedCounterProps {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  suffix = '',
  prefix = ''
}) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = count

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(startValue + (value - startValue) * easeOutQuart)
      
      setCount(currentCount)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, count])

  return <span>{prefix}{count}{suffix}</span>
}

// Typewriter effect
interface TypewriterProps {
  text: string
  speed?: number
  onComplete?: () => void
}

export const Typewriter: React.FC<TypewriterProps> = ({ 
  text, 
  speed = 50, 
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (currentIndex === text.length && onComplete) {
      onComplete()
    }
    
    // Ensure all code paths return a value
    return undefined
  }, [currentIndex, text, speed, onComplete])

  return (
    <span className="inline-block">
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}