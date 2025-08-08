'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { JTBDForceType } from "@/contracts/schema"
import { ForceIndicator, getForceColorClass } from "./ForceIndicator"

interface ForceDistributionChartProps extends React.HTMLAttributes<HTMLDivElement> {
  scores: Record<JTBDForceType, number>
  maxScore?: number
  showLabels?: boolean
  showValues?: boolean
  showPercentages?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'bar' | 'donut' | 'horizontal'
  animated?: boolean
  interactive?: boolean
}

const ForceDistributionChart = React.forwardRef<
  HTMLDivElement,
  ForceDistributionChartProps
>(({ 
  className,
  scores,
  maxScore = 10,
  showLabels = true,
  showValues = false,
  showPercentages = true,
  size = 'md',
  variant = 'bar',
  animated = false,
  interactive = false,
  ...props 
}, ref) => {
  const [hoveredForce, setHoveredForce] = React.useState<JTBDForceType | null>(null)
  
  const forces: JTBDForceType[] = [
    'demographic',
    'pain_of_old',
    'pull_of_new', 
    'anchors_to_old',
    'anxiety_of_new'
  ]
  
  // Calculate totals and percentages
  const totalScore = forces.reduce((sum, force) => sum + (scores[force] || 0), 0)
  const maxPossibleScore = forces.length * maxScore
  
  const forceData = forces.map(force => ({
    force,
    score: scores[force] || 0,
    percentage: totalScore > 0 ? ((scores[force] || 0) / totalScore) * 100 : 0,
    normalizedScore: ((scores[force] || 0) / maxScore) * 100
  }))
  
  const sizeClasses = {
    sm: {
      container: "h-32",
      bar: "h-6",
      text: "text-xs",
      donut: "w-24 h-24"
    },
    md: {
      container: "h-48", 
      bar: "h-8",
      text: "text-sm",
      donut: "w-32 h-32"
    },
    lg: {
      container: "h-64",
      bar: "h-12", 
      text: "text-base",
      donut: "w-40 h-40"
    }
  }
  
  const currentSize = sizeClasses[size]
  
  if (variant === 'horizontal') {
    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {forceData.map((data, index) => (
          <div
            key={data.force}
            className={cn(
              "group transition-all duration-200",
              interactive && "cursor-pointer hover:scale-[1.02]",
              animated && "animate-fade-in-up"
            )}
            style={animated ? { animationDelay: `${index * 100}ms` } : undefined}
            onMouseEnter={() => interactive && setHoveredForce(data.force)}
            onMouseLeave={() => interactive && setHoveredForce(null)}
          >
            <div className="flex items-center justify-between mb-1">
              {showLabels && (
                <ForceIndicator 
                  force={data.force} 
                  size={size === 'lg' ? 'md' : 'sm'}
                />
              )}
              <div className="flex items-center gap-2 text-sm">
                {showValues && (
                  <span className={cn(
                    currentSize.text,
                    getForceColorClass(data.force, 'text')
                  )}>
                    {data.score.toFixed(1)}
                  </span>
                )}
                {showPercentages && (
                  <span className={cn(
                    currentSize.text,
                    "text-muted-foreground"
                  )}>
                    {data.percentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className={cn(
              "relative rounded-full bg-muted overflow-hidden",
              currentSize.bar,
              hoveredForce === data.force && "ring-2 ring-offset-2",
              getForceColorClass(data.force, 'border').replace('border-', 'ring-')
            )}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getForceColorClass(data.force, 'bg'),
                  animated && "animate-progress-fill"
                )}
                style={{
                  width: `${data.normalizedScore}%`,
                  animationDelay: animated ? `${index * 100}ms` : undefined
                }}
              />
              
              {/* Hover overlay */}
              {interactive && hoveredForce === data.force && (
                <div className="absolute inset-0 bg-white/20 dark:bg-black/20 rounded-full animate-fade-in" />
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (variant === 'donut') {
    const radius = size === 'sm' ? 40 : size === 'md' ? 55 : 70
    const circumference = 2 * Math.PI * radius
    let cumulativePercentage = 0
    
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-6", className)}
        {...props}
      >
        <div className={cn("relative", currentSize.donut)}>
          <svg 
            className="transform -rotate-90"
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
          >
            {forceData.map((data, index) => {
              const strokeDasharray = `${(data.percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -cumulativePercentage * circumference / 100
              const result = (
                <circle
                  key={data.force}
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  fill="transparent"
                  stroke={`var(--${data.force.replace('_', '-')}-500)`}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    "transition-all duration-500",
                    interactive && "cursor-pointer hover:stroke-[10]",
                    animated && "animate-fade-in"
                  )}
                  style={animated ? { animationDelay: `${index * 200}ms` } : undefined}
                  onMouseEnter={() => interactive && setHoveredForce(data.force)}
                  onMouseLeave={() => interactive && setHoveredForce(null)}
                />
              )
              cumulativePercentage += data.percentage
              return result
            })}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn("font-bold", currentSize.text)}>
                {totalScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        {showLabels && (
          <div className="space-y-2">
            {forceData.map((data) => (
              <div
                key={data.force}
                className={cn(
                  "flex items-center gap-2",
                  interactive && "cursor-pointer",
                  hoveredForce === data.force && "scale-105"
                )}
                onMouseEnter={() => interactive && setHoveredForce(data.force)}
                onMouseLeave={() => interactive && setHoveredForce(null)}
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    getForceColorClass(data.force, 'bg')
                  )}
                />
                <ForceIndicator 
                  force={data.force} 
                  size="sm"
                  showIcon={false}
                />
                {showPercentages && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {data.percentage.toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // Default bar variant
  return (
    <div
      ref={ref}
      className={cn("space-y-3", className)}
      {...props}
    >
      <div className={cn("flex justify-between items-end", currentSize.container)}>
        {forceData.map((data, index) => (
          <div
            key={data.force}
            className={cn(
              "flex flex-col items-center gap-2 transition-all duration-200",
              interactive && "cursor-pointer hover:scale-105",
              hoveredForce === data.force && "scale-110"
            )}
            style={{ width: `${100 / forces.length}%` }}
            onMouseEnter={() => interactive && setHoveredForce(data.force)}
            onMouseLeave={() => interactive && setHoveredForce(null)}
          >
            {/* Value display */}
            {(showValues || showPercentages) && (
              <div className={cn(
                "text-center",
                currentSize.text,
                animated && "animate-fade-in"
              )}
              style={animated ? { animationDelay: `${index * 100}ms` } : undefined}
              >
                {showValues && (
                  <div className={getForceColorClass(data.force, 'text')}>
                    {data.score.toFixed(1)}
                  </div>
                )}
                {showPercentages && (
                  <div className="text-muted-foreground text-xs">
                    {data.percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            )}
            
            {/* Bar */}
            <div
              className={cn(
                "w-full relative rounded-t bg-muted flex-1 min-h-0",
                "flex flex-col justify-end"
              )}
            >
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-700",
                  getForceColorClass(data.force, 'bg'),
                  animated && "animate-slide-up"
                )}
                style={{
                  height: `${data.normalizedScore}%`,
                  animationDelay: animated ? `${index * 150}ms` : undefined
                }}
              />
              
              {/* Hover overlay */}
              {interactive && hoveredForce === data.force && (
                <div className="absolute inset-0 bg-white/20 dark:bg-black/20 rounded-t animate-fade-in" />
              )}
            </div>
            
            {/* Label */}
            {showLabels && (
              <ForceIndicator 
                force={data.force} 
                size="sm" 
                showIcon={size !== 'sm'}
                className={cn(
                  "transition-all duration-200",
                  animated && "animate-fade-in-up"
                )}
                style={animated ? { animationDelay: `${index * 100 + 300}ms` } : undefined}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Summary info */}
      <div className="pt-2 border-t flex justify-between text-sm text-muted-foreground">
        <span>Total Score: {totalScore.toFixed(1)}/{maxPossibleScore}</span>
        <span>Completion: {((totalScore / maxPossibleScore) * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
})
ForceDistributionChart.displayName = "ForceDistributionChart"

export { ForceDistributionChart }
export type { ForceDistributionChartProps }