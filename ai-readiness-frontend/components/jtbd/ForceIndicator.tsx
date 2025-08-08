'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { JTBDForceType } from "@/contracts/schema"

const forceIndicatorVariants = cva(
  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      force: {
        demographic: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
        pain_of_old: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
        pull_of_new: "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
        anchors_to_old: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
        anxiety_of_new: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

interface ForceIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof forceIndicatorVariants> {
  force: JTBDForceType
  showIcon?: boolean
  showLabel?: boolean
}

// Force configuration with icons and labels
const forceConfig = {
  demographic: {
    icon: "👤",
    label: "Demographics",
    shortLabel: "Demo",
    description: "User characteristics and context"
  },
  pain_of_old: {
    icon: "😤", 
    label: "Pain of Old",
    shortLabel: "Pain",
    description: "Frustrations with current situation"
  },
  pull_of_new: {
    icon: "✨",
    label: "Pull of New", 
    shortLabel: "Pull",
    description: "Attraction to new solution"
  },
  anchors_to_old: {
    icon: "⚓",
    label: "Anchors to Old",
    shortLabel: "Anchors", 
    description: "Resistance to change"
  },
  anxiety_of_new: {
    icon: "😰",
    label: "Anxiety of New",
    shortLabel: "Anxiety",
    description: "Fears about new solution"
  }
} as const

const ForceIndicator = React.forwardRef<
  HTMLDivElement,
  ForceIndicatorProps
>(({ className, force, size, showIcon = true, showLabel = true, ...props }, ref) => {
  const config = forceConfig[force]
  
  return (
    <div
      ref={ref}
      className={cn(forceIndicatorVariants({ force, size }), className)}
      title={config.description}
      {...props}
    >
      {showIcon && (
        <span className="leading-none" role="img" aria-label={config.label}>
          {config.icon}
        </span>
      )}
      {showLabel && (
        <span className="truncate">
          {size === "sm" ? config.shortLabel : config.label}
        </span>
      )}
    </div>
  )
})
ForceIndicator.displayName = "ForceIndicator"

// Utility function to get force color class
export function getForceColorClass(force: JTBDForceType, type: 'bg' | 'text' | 'border' = 'bg') {
  const colorMap = {
    demographic: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    pain_of_old: {
      bg: 'bg-red-100 dark:bg-red-900', 
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800'
    },
    pull_of_new: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-700 dark:text-green-300', 
      border: 'border-green-200 dark:border-green-800'
    },
    anchors_to_old: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    anxiety_of_new: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800'
    }
  }
  
  return colorMap[force][type]
}

// Export force configuration for use in other components
export { forceConfig, forceIndicatorVariants, ForceIndicator }
export type { ForceIndicatorProps }