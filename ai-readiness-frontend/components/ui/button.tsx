'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 button-press touch-target motion-safe relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "gradient-bg-teal text-white hover:scale-105 hover:glow-teal hover:shadow-xl shadow-lg active:scale-[0.98] hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-destructive/25",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-teal-500/50 hover:scale-105 active:scale-[0.98] hover:shadow-md",
        secondary: "gradient-bg-purple text-white hover:scale-105 hover:glow-purple hover:shadow-xl shadow-lg active:scale-[0.98] hover:brightness-110",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-[0.98] hover:shadow-sm",
        link: "text-teal-400 underline-offset-4 hover:underline hover:text-teal-300 hover:scale-[1.02] active:scale-[0.98]",
        glass: "glass-card text-white hover:bg-white/15 hover:scale-105 hover:glow-teal active:scale-[0.98] hover:shadow-xl backdrop-blur-lg",
        success: "bg-green-500 text-white hover:bg-green-600 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/25 active:scale-[0.98]",
        shimmer: "gradient-bg-teal text-white hover:scale-105 hover:glow-teal shadow-lg relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:animate-shimmer",
      },
      size: {
        default: "h-11 px-4 py-2", // Changed from h-10 to h-11 to meet 44px touch target requirement
        sm: "h-10 rounded-md px-3 text-xs", // Changed from h-9 to h-10
        lg: "h-12 rounded-lg px-8 text-base", // Changed from h-11 to h-12
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-11 w-11 p-0", // Changed from h-10 w-10 to h-11 w-11 for 44px touch target
        "icon-sm": "h-10 w-10 p-0", // Changed from h-8 w-8 to h-10 w-10 
        "icon-lg": "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ComponentType<{ className?: string }>
  rightIcon?: React.ComponentType<{ className?: string }>
  loadingText?: string
  pulse?: boolean
  gradient?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    children,
    disabled,
    loadingText,
    pulse = false,
    gradient = false,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const [isPressed, setIsPressed] = React.useState(false)
    
    const handleMouseDown = () => setIsPressed(true)
    const handleMouseUp = () => setIsPressed(false)
    const handleMouseLeave = () => setIsPressed(false)
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          pulse && "animate-pulse-glow",
          gradient && "bg-gradient-to-r from-teal-500 to-purple-500",
          isPressed && "scale-95",
          loading && "cursor-wait"
        )}
        ref={ref}
        disabled={disabled || loading}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Loading State */}
        {loading && (
          <>
            <Loader2 className={cn(
              "animate-spin",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4",
              (children || loadingText) && "mr-2"
            )} />
            {loadingText && <span className="animate-fade-in">{loadingText}</span>}
            {!loadingText && children && (
              <span className="opacity-70">{children}</span>
            )}
          </>
        )}
        
        {/* Normal State */}
        {!loading && (
          <>
            {LeftIcon && (
              <LeftIcon className={cn(
                size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4",
                "mr-2 transition-transform duration-200 group-hover:scale-110"
              )} />
            )}
            
            <span className="relative z-10">{children}</span>
            
            {RightIcon && (
              <RightIcon className={cn(
                size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4",
                "ml-2 transition-transform duration-200 group-hover:scale-110"
              )} />
            )}
          </>
        )}
        
        {/* Ripple Effect */}
        {!asChild && (
          <span className="absolute inset-0 overflow-hidden rounded-lg">
            <span className="absolute inset-0 bg-white/20 transform scale-0 rounded-full transition-transform duration-300 ease-out group-active:scale-100 opacity-0 group-active:opacity-100" />
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// Skeleton Button for loading states
const SkeletonButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "default" | "sm" | "lg" | "xl" | "icon"
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    default: "h-10 w-24",
    sm: "h-9 w-20",
    lg: "h-11 w-28",
    xl: "h-14 w-32",
    icon: "h-10 w-10",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "skeleton rounded-lg",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
SkeletonButton.displayName = "SkeletonButton"

export { Button, buttonVariants, SkeletonButton }