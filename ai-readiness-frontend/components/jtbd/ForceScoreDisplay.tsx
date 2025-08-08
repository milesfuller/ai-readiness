'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { JTBDForceType } from "@/contracts/schema"
import { ForceIndicator, getForceColorClass } from "./ForceIndicator"
import { Progress } from "@/components/ui/progress"

interface ForceScoreDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  force: JTBDForceType
  score: number // 0-10 scale
  maxScore?: number
  showLabel?: boolean
  showNumericScore?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'detailed'
  animated?: boolean
}

const ForceScoreDisplay = React.forwardRef<
  HTMLDivElement,
  ForceScoreDisplayProps
>(({ 
  className, 
  force, 
  score, 
  maxScore = 10,
  showLabel = true,
  showNumericScore = true,
  size = 'md',
  variant = 'default',
  animated = false,
  ...props 
}, ref) => {
  const normalizedScore = Math.max(0, Math.min(maxScore, score))
  const percentage = (normalizedScore / maxScore) * 100
  
  const sizeClasses = {
    sm: {
      container: "gap-2",
      progress: "h-1.5",
      text: "text-xs",
      numeric: "text-xs font-medium min-w-[2rem]"
    },
    md: {
      container: "gap-3",
      progress: "h-2",
      text: "text-sm", 
      numeric: "text-sm font-medium min-w-[2.5rem]"
    },
    lg: {
      container: "gap-4",
      progress: "h-3",
      text: "text-base",
      numeric: "text-base font-semibold min-w-[3rem]"
    }
  }
  
  const currentSize = sizeClasses[size]
  
  // Get intensity level for styling
  const getIntensityLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score <= 3) return 'low'
    if (score <= 7) return 'medium'
    return 'high'
  }
  
  const intensity = getIntensityLevel(normalizedScore)
  
  if (variant === 'minimal') {
    return (
      <div
        ref={ref}
        className={cn("flex items-center", currentSize.container, className)}
        {...props}
      >
        <div className={cn("flex-1", animated && "animate-fade-in")}>
          <Progress 
            value={percentage} 
            className={cn(
              currentSize.progress,
              "transition-all duration-300"
            )}
          />
        </div>
        {showNumericScore && (
          <span className={cn(
            currentSize.numeric,
            getForceColorClass(force, 'text'),
            animated && "animate-fade-in-right"
          )}>
            {normalizedScore.toFixed(1)}
          </span>
        )}
      </div>
    )
  }
  
  if (variant === 'detailed') {
    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2 p-3 rounded-lg border transition-colors",
          getForceColorClass(force, 'bg'),
          getForceColorClass(force, 'border'),
          animated && "animate-fade-in-up",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          {showLabel && <ForceIndicator force={force} size={size} />}
          <div className="flex items-center gap-2">
            <span className={cn(
              currentSize.numeric,
              getForceColorClass(force, 'text')
            )}>
              {normalizedScore.toFixed(1)}/{maxScore}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              intensity === 'high' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
              intensity === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
              intensity === 'low' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            )}>
              {intensity}
            </span>
          </div>
        </div>
        <Progress 
          value={percentage}
          className={cn(currentSize.progress, "transition-all duration-500")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Impact: {percentage.toFixed(0)}%</span>
          <span>{normalizedScore > 7 ? 'Strong' : normalizedScore > 4 ? 'Moderate' : 'Weak'}</span>
        </div>
      </div>
    )
  }
  
  // Default variant
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between",
        currentSize.container,
        animated && "animate-fade-in",
        className
      )}
      {...props}
    >
      {showLabel && (
        <ForceIndicator 
          force={force} 
          size={size}
          className={animated ? "animate-fade-in-right" : ""}
        />
      )}
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Progress 
          value={percentage}
          className={cn(
            currentSize.progress,
            "flex-1 transition-all duration-300",
            animated && "animate-progress-fill"
          )}
        />
        
        {showNumericScore && (
          <span className={cn(
            currentSize.numeric,
            getForceColorClass(force, 'text'),
            "text-right",
            animated && "animate-fade-in-right"
          )}>
            {normalizedScore.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
})
ForceScoreDisplay.displayName = "ForceScoreDisplay"

// Compound component for displaying multiple force scores
interface ForceScoreGridProps extends React.HTMLAttributes<HTMLDivElement> {
  scores: Record<JTBDForceType, number>
  maxScore?: number
  variant?: 'default' | 'minimal' | 'detailed'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  staggerAnimation?: boolean
}

const ForceScoreGrid = React.forwardRef<
  HTMLDivElement,
  ForceScoreGridProps
>(({ 
  className,
  scores,
  maxScore = 10,
  variant = 'default',
  size = 'md',
  animated = false,
  staggerAnimation = false,
  ...props 
}, ref) => {
  const forces: JTBDForceType[] = [
    'demographic',
    'pain_of_old', 
    'pull_of_new',
    'anchors_to_old',
    'anxiety_of_new'
  ]
  
  return (
    <div
      ref={ref}
      className={cn("space-y-3", className)}
      {...props}
    >
      {forces.map((force, index) => (
        <ForceScoreDisplay
          key={force}
          force={force}
          score={scores[force] || 0}
          maxScore={maxScore}
          variant={variant}
          size={size}
          animated={animated}
          className={staggerAnimation ? "" : ""}
          style={staggerAnimation ? {
            animationDelay: `${index * 150}ms`
          } : undefined}
        />
      ))}
    </div>
  )
})
ForceScoreGrid.displayName = "ForceScoreGrid"

export { ForceScoreDisplay, ForceScoreGrid }
export type { ForceScoreDisplayProps, ForceScoreGridProps }