'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground shadow-lg transition-all duration-300 motion-safe relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-card border-border hover:shadow-xl hover:scale-[1.02]",
        glass: "glass-card hover:glass-card-strong hover:scale-[1.02] hover:shadow-2xl",
        interactive: "interactive-card hover:lift-hover cursor-pointer",
        gradient: "gradient-bg-teal/10 border-teal-500/20 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/10",
        floating: "glass-card hover:glass-card-strong hover:shadow-2xl animate-float",
        bordered: "bg-card border-2 border-teal-500/20 hover:border-teal-500/40 hover:glow-teal",
        spotlight: "bg-card border-border hover:bg-gradient-to-br hover:from-teal-50/50 hover:to-purple-50/50 dark:hover:from-teal-950/20 dark:hover:to-purple-950/20",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants> & {
    shimmer?: boolean
    glow?: boolean
    spotlight?: boolean
  }
>(({ className, variant, size, shimmer = false, glow = false, spotlight = false, ...props }, ref) => {
  const [isHovered, setIsHovered] = React.useState(false)
  
  return (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, size, className }),
        shimmer && "shimmer",
        glow && "hover:shadow-xl hover:shadow-teal-500/20",
        spotlight && "group"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Shimmer Effect */}
      {shimmer && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
      )}
      
      {/* Spotlight Effect */}
      {spotlight && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-radial from-teal-500/10 via-transparent to-transparent" />
        </div>
      )}
      
      {props.children}
    </div>
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    animated?: boolean
  }
>(({ className, animated = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      animated && "animate-fade-in-down",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    gradient?: boolean
    size?: "sm" | "default" | "lg" | "xl"
  }
>(({ className, gradient = false, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-lg",
    default: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight transition-colors duration-200",
        sizeClasses[size],
        gradient && "gradient-text",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    animated?: boolean
  }
>(({ className, animated = false, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground transition-colors duration-200",
      animated && "animate-fade-in-up",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    animated?: boolean
    spacing?: "tight" | "default" | "loose"
  }
>(({ className, animated = false, spacing = "default", ...props }, ref) => {
  const spacingClasses = {
    tight: "p-4 pt-0",
    default: "p-6 pt-0",
    loose: "p-8 pt-0",
  }
  
  return (
    <div 
      ref={ref} 
      className={cn(
        spacingClasses[spacing],
        animated && "animate-fade-in-up",
        className
      )} 
      {...props} 
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    animated?: boolean
    justify?: "start" | "center" | "end" | "between"
  }
>(({ className, animated = false, justify = "start", ...props }, ref) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0",
        justifyClasses[justify],
        animated && "animate-fade-in-up",
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

// Special AI Readiness card variants
const StatsCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string
    value: string | number | React.ReactNode
    description?: string
    icon?: React.ComponentType<{ className?: string }>
    trend?: {
      value: number
      label: string
      direction: 'up' | 'down' | 'neutral'
    }
    loading?: boolean
    animated?: boolean
  }
>(({ className, title, value, description, icon: Icon, trend, loading = false, animated = true, ...props }, ref) => {
  if (loading) {
    return (
      <Card ref={ref} variant="glass" className={cn("p-6", className)} {...props}>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-16 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          <div className="skeleton h-12 w-12 rounded-lg" />
        </div>
      </Card>
    )
  }
  
  return (
    <Card 
      ref={ref} 
      variant="glass" 
      className={cn("p-6 group", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className={cn("space-y-1", animated && "animate-fade-in-up")}>
          <p className="text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-teal-400">
            {title}
          </p>
          <p className="text-3xl font-bold gradient-text">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground transition-colors duration-200">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 transition-all duration-300",
            "group-hover:bg-teal-500/20 group-hover:border-teal-500/40",
            // Removed bounce animation
          )}>
            <Icon className="h-6 w-6 text-teal-400 transition-colors duration-200 group-hover:text-teal-300" />
          </div>
        )}
      </div>
      
      {trend && (
        <div className={cn(
          "mt-4 flex items-center space-x-2",
          animated && "animate-fade-in-up"
        )}>
          <div className={cn(
            "flex items-center text-xs font-medium transition-all duration-200",
            trend.direction === 'up' && "text-green-400 group-hover:text-green-300",
            trend.direction === 'down' && "text-red-400 group-hover:text-red-300",
            trend.direction === 'neutral' && "text-muted-foreground"
          )}>
            <span>
              {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}
            </span>
            <span className="ml-1">{Math.abs(trend.value)}%</span>
          </div>
          <span className="text-xs text-muted-foreground transition-colors duration-200">
            {trend.label}
          </span>
        </div>
      )}
    </Card>
  )
})
StatsCard.displayName = "StatsCard"

// Skeleton Card for loading states
const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    withHeader?: boolean
    withFooter?: boolean
    lines?: number
  }
>(({ className, withHeader = true, withFooter = false, lines = 3, ...props }, ref) => (
  <Card ref={ref} className={cn("p-6", className)} {...props}>
    {withHeader && (
      <div className="space-y-2 mb-4">
        <div className="skeleton h-6 w-32 rounded" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>
    )}
    
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "skeleton h-4 rounded",
            i === lines - 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </div>
    
    {withFooter && (
      <div className="flex justify-between items-center mt-6">
        <div className="skeleton h-8 w-20 rounded" />
        <div className="skeleton h-8 w-24 rounded" />
      </div>
    )}
  </Card>
))
SkeletonCard.displayName = "SkeletonCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  StatsCard,
  SkeletonCard,
  cardVariants 
}