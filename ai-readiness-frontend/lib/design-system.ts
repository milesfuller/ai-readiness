/**
 * AI Readiness Design System & Brand Guidelines
 * 
 * This file serves as the central reference for brand consistency across
 * the AI Readiness Assessment platform. All components should follow these
 * guidelines to maintain visual cohesion and professional appearance.
 * 
 * @version 2.0.0
 * @author Brand Guardian Agent
 */

// ===================================================================
// BRAND FOUNDATION
// ===================================================================

/**
 * Brand Color Philosophy
 * 
 * Our tri-color system represents the journey of AI transformation:
 * 🔵 Teal (Innovation & Growth) - Primary brand color for CTAs and main actions
 * 🔮 Purple (Intelligence & Analytics) - Secondary for data visualization and insights
 * 🌸 Pink (Human-Centered & Success) - Tertiary for positive outcomes and warmth
 */

export const brandColors = {
  // Primary Brand Color: Teal (Innovation & Growth)
  primary: {
    50: '#f0fdfa',   // Lightest tint for backgrounds
    100: '#ccfbf1',  // Light accent backgrounds
    200: '#99f6e4',  // Hover states for light theme
    300: '#5eead4',  // Interactive elements
    400: '#2dd4bf',  // Secondary interactive
    500: '#14b8a6',  // PRIMARY brand color - main CTAs, headers
    600: '#0d9488',  // Primary hover state
    700: '#0f766e',  // Dark theme primary
    800: '#115e59',  // Strong emphasis
    900: '#134e4a',  // Darkest text/icons
    950: '#042f2e',  // Ultra dark backgrounds
  },
  
  // Secondary Brand Color: Purple (Intelligence & Analytics)
  secondary: {
    50: '#faf5ff',   // Light backgrounds, alerts
    100: '#f3e8ff',  // Subtle highlights
    200: '#e9d5ff',  // Light interactive states
    300: '#d8b4fe',  // Secondary actions
    400: '#c084fc',  // Accent elements
    500: '#a855f7',  // Secondary brand color
    600: '#8b5cf6',  // SECONDARY brand color - data viz, analytics
    700: '#7c3aed',  // Secondary hover state
    800: '#6d28d9',  // Strong secondary
    900: '#581c87',  // Dark secondary text
    950: '#3b0764',  // Dark secondary backgrounds
  },
  
  // Tertiary Brand Color: Pink (Human-Centered & Warmth)
  tertiary: {
    50: '#fdf2f8',   // Warm background accents
    100: '#fce7f3',  // Gentle highlights
    200: '#fbcfe8',  // Light warm states
    300: '#f9a8d4',  // Warm interactive
    400: '#f472b6',  // Accent warmth
    500: '#ec4899',  // TERTIARY brand color - success, positive
    600: '#db2777',  // Warm emphasis
    700: '#be185d',  // Strong warm
    800: '#9d174d',  // Deep warm
    900: '#831843',  // Dark warm text
    950: '#500724',  // Dark warm backgrounds
  },
} as const

/**
 * Functional Color System
 * For semantic meanings and system states
 */
export const functionalColors = {
  success: '#10B981',    // Green for success states
  warning: '#F59E0B',    // Amber for warnings  
  error: '#EF4444',      // Red for errors
  info: '#3B82F6',       // Blue for information
} as const

// ===================================================================
// TYPOGRAPHY SCALE
// ===================================================================

/**
 * Brand Typography System
 * 
 * Optimized for readability and professional appearance across all devices.
 * Uses a modular scale for consistent hierarchy.
 */
export const typography = {
  fontFamily: {
    display: ['Inter', 'system-ui', 'sans-serif'],
    body: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  
  fontSize: {
    // Display sizes for hero sections
    'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 64px
    
    // Heading hierarchy
    'heading-1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],   // 48px - Page titles
    'heading-2': ['2.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }], // 36px - Section titles
    'heading-3': ['1.875rem', { lineHeight: '1.4' }],                         // 30px - Subsections
    'heading-4': ['1.5rem', { lineHeight: '1.4' }],                           // 24px - Card titles
    
    // Body text sizes
    'body-lg': ['1.125rem', { lineHeight: '1.6' }],                           // 18px - Large body
    'body': ['1rem', { lineHeight: '1.6' }],                                  // 16px - Default body
    'body-sm': ['0.875rem', { lineHeight: '1.5' }],                           // 14px - Small body
    'caption': ['0.75rem', { lineHeight: '1.4' }],                            // 12px - Captions
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

// ===================================================================
// SPACING SYSTEM
// ===================================================================

/**
 * 8px Base Grid System
 * All spacing should use multiples of 8px for visual consistency
 */
export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px  - Base unit
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px
  40: '10rem',   // 160px
  48: '12rem',   // 192px
  56: '14rem',   // 224px
  64: '16rem',   // 256px
} as const

// ===================================================================
// SHADOW SYSTEM
// ===================================================================

/**
 * Brand Shadow System
 * Subtle shadows with brand color tints for depth and hierarchy
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(20, 184, 166, 0.05)',
  default: '0 1px 3px 0 rgba(20, 184, 166, 0.1), 0 1px 2px 0 rgba(20, 184, 166, 0.06)',
  md: '0 4px 6px -1px rgba(20, 184, 166, 0.1), 0 2px 4px -1px rgba(20, 184, 166, 0.06)',
  lg: '0 10px 15px -3px rgba(20, 184, 166, 0.1), 0 4px 6px -2px rgba(20, 184, 166, 0.05)',
  xl: '0 20px 25px -5px rgba(20, 184, 166, 0.1), 0 10px 10px -5px rgba(20, 184, 166, 0.04)',
  '2xl': '0 25px 50px -12px rgba(20, 184, 166, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(20, 184, 166, 0.06)',
  
  // Colored shadows for different brand elements
  teal: '0 4px 6px -1px rgba(20, 184, 166, 0.15), 0 2px 4px -1px rgba(20, 184, 166, 0.1)',
  purple: '0 4px 6px -1px rgba(139, 92, 246, 0.15), 0 2px 4px -1px rgba(139, 92, 246, 0.1)',
  pink: '0 4px 6px -1px rgba(236, 72, 153, 0.15), 0 2px 4px -1px rgba(236, 72, 153, 0.1)',
} as const

// ===================================================================
// BORDER RADIUS SYSTEM
// ===================================================================

/**
 * Border Radius Scale
 * Modern, slightly rounded corners for professional appearance
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  default: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',  // Fully rounded
} as const

// ===================================================================
// ANIMATION SYSTEM
// ===================================================================

/**
 * Brand Animation Timing
 * Subtle, professional animations that enhance UX without distraction
 */
export const animations = {
  // Timing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Duration scale
  duration: {
    fast: '150ms',
    default: '300ms',
    slow: '500ms',
    slower: '750ms',
  },
  
  // Common animations
  transitions: {
    all: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// ===================================================================
// COMPONENT PATTERNS
// ===================================================================

/**
 * Reusable Component Patterns
 * Common styling patterns for consistent implementation
 */
export const patterns = {
  // Button patterns
  button: {
    base: 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    primary: 'bg-teal-500 text-white hover:bg-teal-600 focus-visible:ring-teal-500',
    secondary: 'bg-purple-500 text-white hover:bg-purple-600 focus-visible:ring-purple-500',
    outline: 'border border-border bg-background hover:bg-teal-50 dark:hover:bg-teal-950/10',
  },
  
  // Card patterns
  card: {
    base: 'rounded-xl border border-border bg-card text-card-foreground shadow-lg',
    interactive: 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
    glass: 'bg-white/10 dark:bg-black/20 backdrop-blur-sm border-white/20 dark:border-white/10',
  },
  
  // Input patterns
  input: {
    base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  },
} as const

// ===================================================================
// USAGE GUIDELINES
// ===================================================================

/**
 * Brand Component Usage Guidelines
 * 
 * BUTTONS:
 * - Primary (teal): Main CTAs, primary actions, submit buttons
 * - Secondary (purple): Secondary actions, analytics features, data operations
 * - Tertiary (pink): Success states, positive actions, human-centered features
 * 
 * CARDS:
 * - Default: Standard content containers
 * - Glass: Hero sections, overlay content, premium features
 * - Interactive: Clickable cards that navigate or trigger actions
 * - Gradient: Highlighted content, featured items
 * 
 * COLORS:
 * - Use teal (500-600) for primary actions and navigation
 * - Use purple (500-600) for data visualization and analytics
 * - Use pink (500-600) for success states and positive feedback
 * - Use functional colors (success, warning, error) for system states
 * 
 * TYPOGRAPHY:
 * - Display: Hero headlines only
 * - Heading-1: Page titles
 * - Heading-2: Section titles
 * - Heading-3: Subsection titles
 * - Heading-4: Card titles
 * - Body: All body text (16px)
 * - Body-sm: Secondary text, metadata
 * - Caption: Labels, small print
 * 
 * SPACING:
 * - Use 8px base grid (spacing.2) for all measurements
 * - Section spacing: 48px (spacing.12) to 96px (spacing.24)
 * - Component padding: 16px (spacing.4) to 32px (spacing.8)
 * - Element gaps: 8px (spacing.2) to 24px (spacing.6)
 * 
 * ACCESSIBILITY:
 * - Maintain 4.5:1 contrast ratio for normal text
 * - Maintain 3:1 contrast ratio for large text
 * - Use semantic HTML elements
 * - Provide focus indicators for all interactive elements
 * - Support keyboard navigation
 * - Test with screen readers
 */

// ===================================================================
// BREAKPOINT SYSTEM
// ===================================================================

/**
 * Responsive Breakpoints
 * Mobile-first approach with consistent breakpoints
 */
export const breakpoints = {
  sm: '640px',   // Small tablets and large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops
  xl: '1280px',  // Desktops
  '2xl': '1400px', // Large desktops
} as const

// ===================================================================
// ACCESSIBILITY STANDARDS
// ===================================================================

/**
 * WCAG 2.1 AA Compliance Standards
 * 
 * COLOR CONTRAST:
 * - Normal text: 4.5:1 minimum
 * - Large text (18pt+): 3:1 minimum
 * - Non-text elements: 3:1 minimum
 * 
 * TOUCH TARGETS:
 * - Minimum 44px x 44px for touch interfaces
 * - Adequate spacing between interactive elements
 * 
 * FOCUS INDICATORS:
 * - Visible focus indicators for all interactive elements
 * - 2px minimum thickness for focus outlines
 * - High contrast colors for focus states
 */

export const accessibility = {
  // Minimum touch target size
  touchTarget: {
    minHeight: '44px',
    minWidth: '44px',
  },
  
  // Focus ring specifications
  focusRing: {
    width: '2px',
    offset: '2px',
    color: brandColors.primary[500],
  },
  
  // ARIA label patterns
  labels: {
    loading: 'Loading content, please wait',
    error: 'Error occurred',
    success: 'Action completed successfully',
    warning: 'Warning message',
    info: 'Information',
  },
} as const

// Export all design tokens as a single object for easier consumption
export const designSystem = {
  colors: brandColors,
  functional: functionalColors,
  typography,
  spacing,
  shadows,
  borderRadius,
  animations,
  patterns,
  breakpoints,
  accessibility,
} as const

export default designSystem