import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground shadow-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        glass: "glass-card",
        interactive: "interactive-card",
        gradient: "gradient-bg-teal/10 border-teal-500/20 hover:border-teal-500/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, className }))}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Special AI Readiness card variants
const StatsCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string
    value: string | number
    description?: string
    icon?: React.ComponentType<{ className?: string }>
    trend?: {
      value: number
      label: string
      direction: 'up' | 'down' | 'neutral'
    }
  }
>(({ className, title, value, description, icon: Icon, trend, ...props }, ref) => (
  <Card ref={ref} variant="glass" className={cn("p-6", className)} {...props}>
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold gradient-text">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {Icon && (
        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <Icon className="h-6 w-6 text-teal-400" />
        </div>
      )}
    </div>
    {trend && (
      <div className="mt-4 flex items-center space-x-2">
        <div className={cn(
          "flex items-center text-xs font-medium",
          trend.direction === 'up' && "text-green-400",
          trend.direction === 'down' && "text-red-400",
          trend.direction === 'neutral' && "text-muted-foreground"
        )}>
          <span>{trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}</span>
          <span className="ml-1">{Math.abs(trend.value)}%</span>
        </div>
        <span className="text-xs text-muted-foreground">{trend.label}</span>
      </div>
    )}
  </Card>
))
StatsCard.displayName = "StatsCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  StatsCard,
  cardVariants 
}