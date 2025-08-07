"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-700",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-gradient-to-r from-teal-500 to-purple-500 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// CircularProgress component
interface CircularProgressProps {
  value?: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value = 0, size = 40, strokeWidth = 4, className, children }, ref) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex", className)}
        style={{ width: size, height: size }}
      >
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-teal-500 transition-all duration-300"
          />
        </svg>
        {children && (
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        )}
      </div>
    )
  }
)
CircularProgress.displayName = "CircularProgress"

// StepProgress component for onboarding
interface StepProgressProps {
  steps: Array<{ id: string; title: string; completed: boolean }>
  currentStep: string
  className?: string
}

const StepProgress = ({ steps, currentStep, className }: StepProgressProps) => {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isCompleted = step.completed
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  {
                    "bg-teal-600 text-white": isCompleted,
                    "bg-teal-600/20 text-teal-400 ring-2 ring-teal-600": isActive && !isCompleted,
                    "bg-gray-700 text-gray-400": !isActive && !isCompleted,
                  }
                )}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              <span
                className={cn("ml-2 text-sm font-medium", {
                  "text-teal-400": isActive,
                  "text-white": isCompleted,
                  "text-gray-400": !isActive && !isCompleted,
                })}
              >
                {step.title}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn("h-px flex-1 mx-4", {
                  "bg-teal-600": isCompleted,
                  "bg-gray-700": !isCompleted,
                })}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export { Progress, CircularProgress, StepProgress }