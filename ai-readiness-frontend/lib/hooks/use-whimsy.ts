'use client'

import { useState, useEffect, useCallback } from 'react'

// Hook for managing celebration states
export const useCelebration = () => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showHearts, setShowHearts] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const celebrate = useCallback((type: 'milestone' | 'completion' | 'success' = 'milestone') => {
    switch (type) {
      case 'completion':
        setShowConfetti(true)
        setShowHearts(true)
        setTimeout(() => {
          setShowConfetti(false)
          setTimeout(() => setShowHearts(false), 2000)
        }, 4000)
        break
      case 'success':
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        break
      case 'milestone':
      default:
        setShowHearts(true)
        setTimeout(() => setShowHearts(false), 1500)
        break
    }
  }, [])

  return {
    showConfetti,
    showHearts,
    showSuccess,
    celebrate,
    setShowConfetti,
    setShowHearts,
    setShowSuccess
  }
}

// Hook for progress milestones
export const useProgressMilestones = (progress: number, milestones: number[] = [25, 50, 75, 100]) => {
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set())
  const { celebrate } = useCelebration()

  useEffect(() => {
    milestones.forEach(milestone => {
      if (progress >= milestone && !celebratedMilestones.has(milestone)) {
        setCelebratedMilestones(prev => new Set([...prev, milestone]))
        
        if (milestone === 100) {
          celebrate('completion')
        } else {
          celebrate('milestone')
        }
      }
    })
  }, [progress, milestones, celebratedMilestones, celebrate])

  return { celebratedMilestones }
}

// Hook for success animations
export const useSuccessAnimation = (trigger: boolean, duration: number = 2000) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [trigger, duration])

  return isAnimating
}

// Hook for animated counters
export const useAnimatedCounter = (targetValue: number, duration: number = 1000) => {
  const [currentValue, setCurrentValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = currentValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const newValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart)
      
      setCurrentValue(newValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    if (targetValue !== currentValue) {
      requestAnimationFrame(animate)
    }
  }, [targetValue, duration, currentValue])

  return currentValue
}

// Easter egg detection
export const useEasterEgg = (sequence: string[], callback: () => void) => {
  const [currentSequence, setCurrentSequence] = useState<string[]>([])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setCurrentSequence(prev => {
        const newSequence = [...prev, event.code].slice(-sequence.length)
        
        if (newSequence.join(',') === sequence.join(',')) {
          callback()
          return []
        }
        
        return newSequence
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sequence, callback])

  return currentSequence
}

// Whimsy utilities
export const whimsyUtils = {
  // Random encouraging messages
  getEncouragingMessage: (progress: number): string => {
    if (progress < 25) return "🚀 You're off to a great start!"
    if (progress < 50) return "⭐ Making excellent progress!"
    if (progress < 75) return "🔥 You're on fire! Keep going!"
    if (progress < 100) return "🎯 Almost there! You've got this!"
    return "🎉 Amazing work! You're done!"
  },

  // Random loading messages
  getLoadingMessage: (): string => {
    const messages = [
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
    return messages[Math.floor(Math.random() * messages.length)]
  },

  // Generate confetti colors
  getConfettiColors: (theme: 'default' | 'success' | 'celebration' = 'default'): string[] => {
    switch (theme) {
      case 'success':
        return ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      case 'celebration':
        return ['#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f472b6']
      default:
        return ['#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
    }
  }
}