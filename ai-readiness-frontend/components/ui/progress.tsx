"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-muted",
        gradient: "bg-muted",
        glass: "glass-input",
        outlined: "border-2 border-muted bg-transparent",
      },
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-teal-500",
        gradient: "bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500",
        glass: "bg-teal-500/80 backdrop-blur-sm",
        outlined: "bg-teal-500",
      },
      animated: {
        true: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-shimmer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animated: false,
    },
  }
)

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  size?: "sm" | "default" | "lg" | "xl"
  animated?: boolean
  showValue?: boolean
  label?: string
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, variant, size, animated = false, showValue = false, label, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  
  // Animate progress value changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value ?? 0)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])
  
  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-sm font-medium text-muted-foreground">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-medium text-teal-500 animate-fade-in">
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}
      
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(indicatorVariants({ variant, animated }))}
          style={{ 
            transform: `translateX(-${100 - displayValue}%)`,
            transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {/* Shimmer effect for animated variant */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular Progress Component
const CircularProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
    size?: number
    strokeWidth?: number
    className?: string
    variant?: "default" | "gradient" | "success" | "warning" | "error"
    showValue?: boolean
    animated?: boolean
    label?: string
  }
>(({ 
  className, 
  value = 0, 
  size = 40, 
  strokeWidth = 4, 
  variant = "default",
  showValue = true,
  animated = true,
  label,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (displayValue / 100) * circumference
  
  // Animate progress value changes
  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(value)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayValue(value)
    }
  }, [value, animated])
  
  const getStrokeColor = () => {
    switch (variant) {
      case "gradient":
        return "url(#gradient)"
      case "success":
        return "#10b981"
      case "warning":
        return "#f59e0b"
      case "error":
        return "#ef4444"
      default:
        return "#14b8a6"
    }
  }
  
  const getTextColor = () => {
    switch (variant) {
      case "success":
        return "text-green-500"
      case "warning":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
      default:
        return "text-teal-500"
    }
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      
      <div 
        ref={ref}
        className={cn("relative animate-scale-in", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Gradient definition for gradient variant */}
          {variant === "gradient" && (
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          )}
          
          {/* Background circle */}
          <circle
            className="text-muted stroke-current"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          
          {/* Progress circle */}
          <circle
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke={getStrokeColor()}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className={cn(
              "transition-all duration-1000 ease-out",
              animated && "animate-progress-fill"
            )}
            style={{
              filter: variant === "gradient" ? "drop-shadow(0 0 6px rgba(139, 92, 246, 0.3))" : undefined
            }}
          />
        </svg>
        
        {/* Center content */}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "font-semibold animate-fade-in",
              size <= 40 ? "text-xs" : size <= 60 ? "text-sm" : "text-base",
              getTextColor()
            )}>
              {Math.round(displayValue)}%
            </span>
          </div>
        )}
        
        {/* Glow effect for certain variants */}
        {(variant === "gradient" || variant === "default") && (
          <div className="absolute inset-0 rounded-full opacity-20 animate-pulse-glow" 
               style={{ 
                 boxShadow: `0 0 ${size / 4}px ${getStrokeColor()}30` 
               }} />
        )}
      </div>
    </div>
  )
})
CircularProgress.displayName = "CircularProgress"

// Multi-step Progress Component
const StepProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    steps: Array<{
      label: string
      description?: string
      completed?: boolean
      current?: boolean
    }>
    orientation?: "horizontal" | "vertical"
  }
>(({ className, steps, orientation = "horizontal", ...props }, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        "flex",
        orientation === "horizontal" ? "space-x-4" : "flex-col space-y-4",
        className
      )}
      {...props}
    >
      {steps.map((step, index) => (
        <div key={index} className={cn(
          "flex items-center",
          orientation === "horizontal" ? "flex-col" : "flex-row space-x-3"
        )}>
          {/* Step indicator */}
          <div className={cn(
            "relative flex items-center justify-center rounded-full border-2 transition-all duration-300",
            orientation === "horizontal" ? "h-8 w-8" : "h-6 w-6 flex-shrink-0",
            step.completed 
              ? "bg-teal-500 border-teal-500 text-white"
              : step.current 
                ? "border-teal-500 bg-teal-50 text-teal-500 animate-pulse-glow"
                : "border-muted bg-background text-muted-foreground"
          )}>
            {step.completed ? (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-xs font-medium">{index + 1}</span>
            )}
          </div>
          
          {/* Step content */}
          <div className={cn(
            "text-center",
            orientation === "horizontal" ? "mt-2" : "ml-0"
          )}>
            <p className={cn(
              "text-sm font-medium transition-colors duration-200",
              step.completed || step.current ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
            </p>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className={cn(
              "bg-muted transition-colors duration-300",
              orientation === "horizontal" 
                ? "h-px w-full mt-4" 
                : "w-px h-8 ml-3",
              (step.completed || (index < steps.findIndex(s => s.current))) && "bg-teal-500"
            )} />
          )}
        </div>
      ))}
    </div>
  )
})
StepProgress.displayName = "StepProgress"

// Skeleton Progress for loading states
const SkeletonProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    withLabel?: boolean
    size?: "sm" | "default" | "lg" | "xl"
  }
>(({ className, withLabel = false, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-1",
    default: "h-2",
    lg: "h-3",
    xl: "h-4",
  }
  
  return (
    <div className="space-y-2" {...props}>
      {withLabel && (
        <div className="flex justify-between">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-4 w-8 rounded" />
        </div>
      )}
      <div
        ref={ref}
        className={cn(
          "skeleton rounded-full w-full",
          sizeClasses[size],
          className
        )}
      />
    </div>
  )
})
SkeletonProgress.displayName = "SkeletonProgress"

export { Progress, CircularProgress, StepProgress, SkeletonProgress }