import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { designSystem } from './design-system'

/**
 * Enhanced utility function for merging Tailwind CSS classes with brand consistency
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Brand-consistent variant utilities
 * Provides type-safe access to brand color variants
 */
export const brandVariants = {
  // Color variant helpers
  primary: (shade: keyof typeof designSystem.colors.primary = 500) => 
    `teal-${shade}` as const,
  secondary: (shade: keyof typeof designSystem.colors.secondary = 600) => 
    `purple-${shade}` as const,
  tertiary: (shade: keyof typeof designSystem.colors.tertiary = 500) => 
    `pink-${shade}` as const,
    
  // Button variant helpers
  buttonPrimary: () => cn(
    "bg-teal-500 text-white hover:bg-teal-600 focus-visible:ring-teal-500",
    "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/25"
  ),
  buttonSecondary: () => cn(
    "bg-purple-500 text-white hover:bg-purple-600 focus-visible:ring-purple-500",
    "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25"
  ),
  buttonTertiary: () => cn(
    "bg-pink-500 text-white hover:bg-pink-600 focus-visible:ring-pink-500",
    "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25"
  ),
  
  // Card variant helpers
  cardDefault: () => cn(
    "rounded-xl border border-border bg-card text-card-foreground shadow-lg",
    "transition-all duration-300 hover:shadow-xl"
  ),
  cardGlass: () => cn(
    "bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10",
    "rounded-xl text-card-foreground shadow-lg transition-all duration-300"
  ),
  cardInteractive: () => cn(
    "rounded-xl border border-border bg-card text-card-foreground shadow-lg",
    "transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer",
    "focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2"
  ),
} as const

/**
 * Accessibility helpers for consistent focus and interaction states
 */
export const a11y = {
  // Focus ring with brand colors
  focusRing: () => cn(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  ),
  
  // Touch-friendly sizing
  touchTarget: () => "min-h-[44px] min-w-[44px]",
  
  // Screen reader only content
  srOnly: () => "sr-only",
  
  // Skip link for keyboard navigation
  skipLink: () => cn(
    "absolute -top-40 left-6 z-50 bg-teal-600 text-white px-4 py-2 rounded",
    "focus:top-6 transition-all duration-200"
  ),
} as const

/**
 * Animation helpers that respect user preferences
 */
export const animations = {
  // Hover scale with motion preferences
  hoverScale: () => "hover:scale-[1.02] motion-reduce:hover:scale-100",
  
  // Fade in animation
  fadeIn: () => "animate-fade-in motion-reduce:animate-none",
  
  // Slide in animation
  slideIn: () => "animate-slide-in motion-reduce:animate-none",
  
  // Brand glow effects
  glowTeal: () => "hover:shadow-lg hover:shadow-teal-500/25 motion-reduce:hover:shadow-lg",
  glowPurple: () => "hover:shadow-lg hover:shadow-purple-500/25 motion-reduce:hover:shadow-lg",
  glowPink: () => "hover:shadow-lg hover:shadow-pink-500/25 motion-reduce:hover:shadow-lg",
} as const

/**
 * Typography helpers for consistent text styling
 */
export const typography = {
  // Heading variants
  display: () => "text-display font-bold tracking-tight",
  h1: () => "text-heading-1 font-semibold tracking-tight",
  h2: () => "text-heading-2 font-semibold tracking-tight", 
  h3: () => "text-heading-3 font-semibold",
  h4: () => "text-heading-4 font-medium",
  
  // Body text variants
  bodyLg: () => "text-body-lg leading-relaxed",
  body: () => "text-body leading-relaxed",
  bodySm: () => "text-body-sm leading-normal",
  caption: () => "text-caption leading-tight text-muted-foreground",
  
  // Brand gradient text
  gradientText: () => cn(
    "bg-gradient-to-r from-teal-500 via-purple-600 to-pink-500",
    "bg-clip-text text-transparent"
  ),
} as const

/**
 * Layout helpers for consistent spacing and structure
 */
export const layout = {
  // Container variants
  container: () => "container mx-auto px-4 sm:px-6 lg:px-8",
  
  // Section spacing
  section: () => "py-12 md:py-16 lg:py-20",
  sectionSm: () => "py-8 md:py-12",
  sectionLg: () => "py-16 md:py-24 lg:py-32",
  
  // Grid systems
  gridAuto: () => "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  gridCards: () => "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
  
  // Flex utilities
  centerContent: () => "flex items-center justify-center",
  spaceBetween: () => "flex items-center justify-between",
} as const

/**
 * Form helpers for consistent input styling
 */
export const forms = {
  // Input variants
  input: () => cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
    "text-sm ring-offset-background file:border-0 file:bg-transparent",
    "file:text-sm file:font-medium placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
    "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  ),
  
  // Label styling
  label: () => "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  
  // Form group spacing
  group: () => "space-y-2",
  
  // Error states
  error: () => "text-sm text-red-500 mt-1",
  errorInput: () => "border-red-500 focus-visible:ring-red-500",
} as const

/**
 * Status and state helpers
 */
export const status = {
  // Success states
  success: () => "text-green-600 bg-green-50 border-green-200",
  successText: () => "text-green-600 dark:text-green-400",
  
  // Warning states  
  warning: () => "text-yellow-800 bg-yellow-50 border-yellow-200",
  warningText: () => "text-yellow-600 dark:text-yellow-400",
  
  // Error states
  error: () => "text-red-600 bg-red-50 border-red-200",
  errorText: () => "text-red-600 dark:text-red-400",
  
  // Info states
  info: () => "text-blue-600 bg-blue-50 border-blue-200",
  infoText: () => "text-blue-600 dark:text-blue-400",
} as const

/**
 * Utility function to get consistent brand colors
 */
export function getBrandColor(
  variant: 'primary' | 'secondary' | 'tertiary',
  shade: number = 500
): string {
  const colorMap = {
    primary: 'teal',
    secondary: 'purple', 
    tertiary: 'pink',
  }
  return `${colorMap[variant]}-${shade}`
}

/**
 * Brand-specific class name generators
 */
export const brand = {
  // Generate consistent component classes
  component: (base: string, variant?: string, size?: string) => cn(
    base,
    variant && `${base}--${variant}`,
    size && `${base}--${size}`
  ),
  
  // Brand color class generator
  color: (color: 'teal' | 'purple' | 'pink', type: 'bg' | 'text' | 'border' = 'text', shade: number = 500) => 
    `${type}-${color}-${shade}`,
    
  // Interactive state classes
  interactive: () => cn(
    "transition-all duration-300 cursor-pointer",
    "hover:scale-[1.02] motion-reduce:hover:scale-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
    "focus-visible:ring-offset-2"
  ),
} as const