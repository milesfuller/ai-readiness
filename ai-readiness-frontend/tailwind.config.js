/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Semantic design tokens (shadcn/ui base)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // AI Readiness Brand Colors - Professional Tech Gradient System
        // Brand Foundation: Teal (Innovation) → Purple (Intelligence) → Pink (Human-Centered)
        
        // Primary Brand Color: Teal (Innovation & Growth)
        teal: {
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
        purple: {
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
        pink: {
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
        
        // Functional Colors (Semantic meanings)
        success: {
          DEFAULT: '#10B981', // Green for success states
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B', // Amber for warnings
          foreground: '#FFFFFF',
        },
        error: {
          DEFAULT: '#EF4444', // Red for errors
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#3B82F6', // Blue for information
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(20, 184, 166, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(20, 184, 166, 0.6)" },
        },
        "glow-purple": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(139, 92, 246, 0.6)" },
        },
        "glow-pink": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(236, 72, 153, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(236, 72, 153, 0.6)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 rgba(20, 184, 166, 0.7)",
            transform: "scale(1)"
          },
          "70%": { 
            boxShadow: "0 0 0 10px rgba(20, 184, 166, 0)",
            transform: "scale(1.05)"
          },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "skeleton": {
          "0%": { backgroundColor: "hsl(var(--muted))" },
          "50%": { backgroundColor: "hsl(var(--muted-foreground) / 0.1)" },
          "100%": { backgroundColor: "hsl(var(--muted))" },
        },
        "progress-fill": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "bounce-in": "bounce-in 0.6s ease-out",
        glow: "glow 2s ease-in-out infinite",
        "glow-purple": "glow-purple 2s ease-in-out infinite",
        "glow-pink": "glow-pink 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s infinite",
        shimmer: "shimmer 2s linear infinite",
        skeleton: "skeleton 1.5s ease-in-out infinite",
        "progress-fill": "progress-fill 0.8s ease-out",
        float: "float 3s ease-in-out infinite",
      },
      backgroundImage: {
        // Core gradient utilities
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        
        // Brand Gradient System - Professional & Cohesive
        'brand-primary': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // Teal gradient
        'brand-secondary': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Purple gradient
        'brand-tertiary': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Pink gradient
        
        // Multi-color brand gradients for hero sections
        'brand-hero': 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 50%, #ec4899 100%)',
        'brand-subtle': 'linear-gradient(135deg, #14b8a6/10 0%, #8b5cf6/10 50%, #ec4899/10 100%)',
        'brand-animated': 'linear-gradient(90deg, #14b8a6 0%, #8b5cf6 25%, #ec4899 50%, #8b5cf6 75%, #14b8a6 100%)',
        'progress-glow': 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 50%, #ec4899 100%)',
        
        // Dark theme optimized gradients
        'dark-brand': 'linear-gradient(135deg, #042f2e 0%, #1a1a1a 50%, #500724 100%)',
        'dark-subtle': 'linear-gradient(135deg, rgba(20,184,166,0.05) 0%, rgba(139,92,246,0.05) 50%, rgba(236,72,153,0.05) 100%)',
        
        // Legacy support (deprecated - use brand-* variants)
        'teal-gradient': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'purple-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'pink-gradient': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        'dark-gradient': 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #0a0a0a 100%)',
      },
      spacing: {
        // Brand spacing scale - 8px base grid system
        '18': '4.5rem',   // 72px - Large gaps
        '88': '22rem',    // 352px - Extra large containers
        '15': '3.75rem',  // 60px - Section spacing
        '30': '7.5rem',   // 120px - Hero section spacing
        '50': '12.5rem',  // 200px - Page section dividers
      },
      
      // Professional typography scale
      fontSize: {
        'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 64px - Hero displays
        'heading-1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],   // 48px - Page titles
        'heading-2': ['2.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }], // 36px - Section titles
        'heading-3': ['1.875rem', { lineHeight: '1.4' }],                         // 30px - Subsections
        'heading-4': ['1.5rem', { lineHeight: '1.4' }],                           // 24px - Card titles
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],                           // 18px - Large body
        'body': ['1rem', { lineHeight: '1.6' }],                                  // 16px - Default body
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],                           // 14px - Small body
        'caption': ['0.75rem', { lineHeight: '1.4' }],                            // 12px - Captions
      },
      minHeight: {
        '44': '44px', // Minimum touch target size
      },
      minWidth: {
        '44': '44px', // Minimum touch target size
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}