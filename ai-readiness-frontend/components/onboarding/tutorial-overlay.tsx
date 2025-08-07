'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, ArrowRight, ArrowLeft, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TutorialStep } from '@/lib/types'

interface TutorialOverlayProps {
  isActive: boolean
  currentStep: number
  steps: TutorialStep[]
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isActive,
  currentStep,
  steps,
  onNext,
  onPrev,
  onSkip,
  onClose
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  const currentStepData = steps[currentStep]

  useEffect(() => {
    if (!isActive || !currentStepData?.target) return

    const findTarget = () => {
      const element = document.querySelector(currentStepData.target!) as HTMLElement
      if (element) {
        setTargetElement(element)
        
        const rect = element.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        // Set highlight position
        setHighlightPosition({
          top: rect.top + scrollTop,
          left: rect.left + scrollLeft,
          width: rect.width,
          height: rect.height
        })

        // Calculate tooltip position based on preferred position
        let tooltipTop = rect.top + scrollTop
        let tooltipLeft = rect.left + scrollLeft
        
        const padding = 20
        const tooltipWidth = 320 // approximate width
        const tooltipHeight = 200 // approximate height

        switch (currentStepData.position) {
          case 'top':
            tooltipTop -= tooltipHeight + padding
            tooltipLeft += (rect.width - tooltipWidth) / 2
            break
          case 'bottom':
            tooltipTop += rect.height + padding
            tooltipLeft += (rect.width - tooltipWidth) / 2
            break
          case 'left':
            tooltipLeft -= tooltipWidth + padding
            tooltipTop += (rect.height - tooltipHeight) / 2
            break
          case 'right':
            tooltipLeft += rect.width + padding
            tooltipTop += (rect.height - tooltipHeight) / 2
            break
          default:
            tooltipTop += rect.height + padding
            tooltipLeft += (rect.width - tooltipWidth) / 2
        }

        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        if (tooltipLeft < 10) tooltipLeft = 10
        if (tooltipLeft + tooltipWidth > viewportWidth - 10) tooltipLeft = viewportWidth - tooltipWidth - 10
        if (tooltipTop < 10) tooltipTop = 10
        if (tooltipTop + tooltipHeight > viewportHeight + scrollTop - 10) {
          tooltipTop = viewportHeight + scrollTop - tooltipHeight - 10
        }

        setTooltipPosition({ top: tooltipTop, left: tooltipLeft })

        // Scroll element into view if needed
        const elementRect = element.getBoundingClientRect()
        if (elementRect.top < 0 || elementRect.bottom > window.innerHeight) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    // Initial find
    findTarget()

    // Retry after a short delay in case elements are still rendering
    const retryTimer = setTimeout(findTarget, 100)

    // Listen for resize events
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget)

    return () => {
      clearTimeout(retryTimer)
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget)
    }
  }, [isActive, currentStepData, currentStep])

  if (!isActive || !currentStepData) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with cutout */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          clipPath: targetElement 
            ? `polygon(0% 0%, 0% 100%, ${highlightPosition.left}px 100%, ${highlightPosition.left}px ${highlightPosition.top}px, ${highlightPosition.left + highlightPosition.width}px ${highlightPosition.top}px, ${highlightPosition.left + highlightPosition.width}px ${highlightPosition.top + highlightPosition.height}px, ${highlightPosition.left}px ${highlightPosition.top + highlightPosition.height}px, ${highlightPosition.left}px 100%, 100% 100%, 100% 0%)`
            : undefined
        }}
        onClick={onClose}
      />

      {/* Highlight ring around target */}
      {targetElement && (
        <div
          className="absolute border-2 border-teal-400 rounded-lg animate-pulse"
          style={{
            top: highlightPosition.top - 4,
            left: highlightPosition.left - 4,
            width: highlightPosition.width + 8,
            height: highlightPosition.height + 8,
            boxShadow: '0 0 20px rgba(20, 184, 166, 0.5)'
          }}
        />
      )}

      {/* Tutorial Tooltip */}
      <Card
        variant="glass"
        className={cn(
          "absolute w-80 max-w-[90vw] backdrop-blur-xl border-white/20 animate-fade-in",
          !targetElement && "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        )}
        style={targetElement ? { 
          top: tooltipPosition.top, 
          left: tooltipPosition.left 
        } : undefined}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-teal-400" />
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold gradient-text">
              {currentStepData.title}
            </h3>
            <p className="text-muted-foreground">
              {currentStepData.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
            <div className="flex items-center space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  leftIcon={ArrowLeft}
                >
                  Back
                </Button>
              )}
              
              {currentStepData.showSkip !== false && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                >
                  Skip Tour
                </Button>
              )}
            </div>

            <Button
              size="sm"
              onClick={onNext}
              rightIcon={currentStep === steps.length - 1 ? undefined : ArrowRight}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentStep ? "bg-teal-400 scale-125" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Pointer arrow */}
        {targetElement && (
          <div
            className={cn(
              "absolute w-3 h-3 bg-card border-l border-t border-white/20 rotate-45",
              currentStepData.position === 'top' && "bottom-[-6px] left-1/2 transform -translate-x-1/2",
              currentStepData.position === 'bottom' && "top-[-6px] left-1/2 transform -translate-x-1/2",
              currentStepData.position === 'left' && "right-[-6px] top-1/2 transform -translate-y-1/2",
              currentStepData.position === 'right' && "left-[-6px] top-1/2 transform -translate-y-1/2"
            )}
          />
        )}
      </Card>
    </div>
  )
}