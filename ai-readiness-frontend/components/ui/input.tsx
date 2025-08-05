import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Loader2 } from "lucide-react"

const inputVariants = cva(
  "flex w-full rounded-lg border border-input bg-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 touch-target motion-safe",
  {
    variants: {
      variant: {
        default: "border-border focus-visible:border-teal-500 hover:border-teal-500/50",
        glass: "glass-input focus-visible:border-teal-500 focus-visible:glow-teal hover:bg-white/10",
        error: "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive bg-destructive/5",
        success: "border-green-500 focus-visible:ring-green-500/50 focus-visible:border-green-500 bg-green-500/5",
        warning: "border-yellow-500 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500 bg-yellow-500/5",
      },
      size: {
        default: "h-11", // Changed from h-10 to h-11 to meet 44px touch target requirement
        sm: "h-10 text-xs", // Changed from h-9 to h-10 
        lg: "h-12 text-base", // Changed from h-11 to h-12
        xl: "h-14 text-lg px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ComponentType<{ className?: string }>
  rightIcon?: React.ComponentType<{ className?: string }>
  error?: string
  success?: boolean
  warning?: string
  label?: string
  description?: string
  loading?: boolean
  clearable?: boolean
  onClear?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    variant, 
    size, 
    leftIcon: LeftIcon, 
    rightIcon: RightIcon,
    error,
    success = false,
    warning,
    label,
    description,
    loading = false,
    clearable = false,
    onClear,
    value,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type
    const hasValue = value && value.toString().length > 0
    
    // Determine variant based on state
    const getVariant = () => {
      if (error) return "error"
      if (warning) return "warning"
      if (success) return "success"
      return variant
    }

    const inputElement = (
      <div className={cn(
        "relative group",
        isFocused && "animate-fade-in-up"
      )}>
        {/* Left Icon */}
        {LeftIcon && (
          <div className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 transition-all duration-200",
            isFocused ? "text-teal-500 scale-110" : "text-muted-foreground"
          )}>
            <LeftIcon className={cn(
              "transition-all duration-200",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
            )} />
          </div>
        )}
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className={cn(
              "animate-spin text-teal-500",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
            )} />
          </div>
        )}
        
        {/* Input Field */}
        <input
          type={inputType}
          value={value}
          className={cn(
            inputVariants({ variant: getVariant(), size, className }),
            (LeftIcon || loading) && "pl-10",
            (RightIcon || isPassword || (clearable && hasValue)) && "pr-10",
            isFocused && "scale-[1.01] shadow-lg",
            "group-hover:border-teal-500/30"
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          ref={ref}
          {...props}
        />
        
        {/* Right side controls */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Clear button */}
          {clearable && hasValue && !isPassword && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
              onClick={(e) => {
                e.preventDefault()
                onClear?.()
              }}
              tabIndex={-1}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-all duration-200 p-1 rounded-full hover:bg-muted hover:scale-110"
              onClick={(e) => {
                e.preventDefault()
                setShowPassword(!showPassword)
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 animate-fade-in" />
              ) : (
                <Eye className="h-4 w-4 animate-fade-in" />
              )}
            </button>
          )}
          
          {/* Right Icon */}
          {RightIcon && !isPassword && !(clearable && hasValue) && (
            <RightIcon className={cn(
              "text-muted-foreground transition-all duration-200",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4",
              isFocused && "text-teal-500 scale-110"
            )} />
          )}
        </div>
        
        {/* Focus Ring Animation */}
        {isFocused && (
          <div className="absolute inset-0 rounded-lg border-2 border-teal-500/30 animate-pulse-glow pointer-events-none" />
        )}
      </div>
    )

    if (label || description || error || warning) {
      return (
        <div className="space-y-2 animate-fade-in-up">
          {label && (
            <label className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200",
              isFocused && "text-teal-500",
              error && "text-destructive",
              success && "text-green-500"
            )}>
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          {inputElement}
          
          {/* Success Message */}
          {success && !error && !warning && (
            <div className="flex items-center space-x-1 animate-fade-in">
              <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-600">Valid input</p>
            </div>
          )}
          
          {/* Warning Message */}
          {warning && !error && (
            <div className="flex items-center space-x-1 animate-fade-in">
              <svg className="h-3 w-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-yellow-600">{warning}</p>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-1 animate-fade-in" data-testid={`${type === 'email' ? 'email' : type === 'password' ? 'password' : 'field'}-error`}>
              <svg className="h-3 w-3 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-destructive animate-pulse">{error}</p>
            </div>
          )}
          
          {/* Description */}
          {description && !error && !warning && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )
    }

    return inputElement
  }
)
Input.displayName = "Input"

// Skeleton Input for loading states
const SkeletonInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    withLabel?: boolean
    size?: "default" | "sm" | "lg" | "xl"
  }
>(({ className, withLabel = false, size = "default", ...props }, ref) => {
  const sizeClasses = {
    default: "h-10",
    sm: "h-9",
    lg: "h-11",
    xl: "h-14",
  }
  
  return (
    <div className="space-y-2" {...props}>
      {withLabel && <div className="skeleton h-4 w-20 rounded" />}
      <div
        ref={ref}
        className={cn(
          "skeleton rounded-lg w-full",
          sizeClasses[size],
          className
        )}
      />
    </div>
  )
})
SkeletonInput.displayName = "SkeletonInput"

// Textarea component
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: string
    success?: boolean
    warning?: string
    label?: string
    description?: string
    loading?: boolean
  }
>(({ className, error, success = false, warning, label, description, loading = false, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  
  const getVariant = () => {
    if (error) return "error"
    if (warning) return "warning"
    if (success) return "success"
    return "default"
  }
  
  const textareaElement = (
    <div className="relative group">
      {loading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
        </div>
      )}
      
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-300 touch-target motion-safe",
          error && "border-destructive focus-visible:ring-destructive/50 bg-destructive/5",
          warning && "border-yellow-500 focus-visible:ring-yellow-500/50 bg-yellow-500/5",
          success && "border-green-500 focus-visible:ring-green-500/50 bg-green-500/5",
          isFocused && "scale-[1.01] shadow-lg border-teal-500",
          loading && "pr-10",
          "hover:border-teal-500/30",
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        ref={ref}
        {...props}
      />
      
      {/* Focus Ring Animation */}
      {isFocused && (
        <div className="absolute inset-0 rounded-lg border-2 border-teal-500/30 animate-pulse-glow pointer-events-none" />
      )}
    </div>
  )

  if (label || description || error || warning) {
    return (
      <div className="space-y-2 animate-fade-in-up">
        {label && (
          <label className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200",
            isFocused && "text-teal-500",
            error && "text-destructive",
            success && "text-green-500"
          )}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        {textareaElement}
        
        {/* Success Message */}
        {success && !error && !warning && (
          <div className="flex items-center space-x-1 animate-fade-in">
            <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-600">Valid input</p>
          </div>
        )}
        
        {/* Warning Message */}
        {warning && !error && (
          <div className="flex items-center space-x-1 animate-fade-in">
            <svg className="h-3 w-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-yellow-600">{warning}</p>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-1 animate-fade-in">
            <svg className="h-3 w-3 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-destructive animate-pulse">{error}</p>
          </div>
        )}
        
        {/* Description */}
        {description && !error && !warning && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }

  return textareaElement
})
Textarea.displayName = "Textarea"

export { Input, Textarea, inputVariants, SkeletonInput }