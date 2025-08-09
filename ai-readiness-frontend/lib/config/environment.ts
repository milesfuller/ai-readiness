/**
 * Environment Configuration
 * Centralized environment detection and configuration
 */

// Determine environment first
// Vercel preview should be treated as staging
const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' || process.env.VERCEL_ENV === 'preview'
const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' && !isPreview
const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || isPreview

// Select the correct environment variables based on environment
const supabaseUrl = (isStaging || isPreview) && process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
  ? process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabaseAnonKey = (isStaging || isPreview) && process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseServiceKey = (isStaging || isPreview) && process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY
  ? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY

const databaseUrl = (isStaging || isPreview) && process.env.STAGING_DATABASE_URL
  ? process.env.STAGING_DATABASE_URL
  : process.env.DATABASE_URL

export const config = {
  // Environment detection
  isProduction,
  isStaging,
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isPreview,
  vercelEnv: process.env.VERCEL_ENV, // 'production' | 'preview' | 'development'
  
  // Feature flags based on environment
  features: {
    debugMode: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
    allowDataExport: !isProduction,
    showTestBanner: !isProduction,
    enableMigrations: process.env.ENABLE_AUTO_MIGRATIONS === 'true',
    requireMigrationTests: process.env.REQUIRE_MIGRATION_TESTS === 'true',
    blockDirectProduction: process.env.BLOCK_DIRECT_PRODUCTION === 'true',
  },
  
  // Database configuration - using selected environment variables
  database: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceKey: supabaseServiceKey,
    directUrl: databaseUrl,
  },
  
  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  
  // Security configuration
  security: {
    csrfSecret: process.env.CSRF_SECRET,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    migrationAdminToken: process.env.MIGRATION_ADMIN_TOKEN,
  },
  
  // Monitoring configuration
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    securityWebhook: process.env.SECURITY_WEBHOOK_URL,
    loggingToken: process.env.SECURITY_LOGGING_TOKEN,
  }
} as const

/**
 * Get environment name for display
 */
export function getEnvironmentName(): string {
  if (config.isProduction) return 'Production'
  if (config.isStaging) return 'Staging'  // This now includes preview
  if (config.isTest) return 'Test'
  if (config.isDevelopment) return 'Development'
  // Fallback for edge cases
  if (process.env.VERCEL_ENV === 'preview') return 'Staging (Preview)'
  return 'Unknown'
}

/**
 * Get environment color for UI indicators
 */
export function getEnvironmentColor(): string {
  if (config.isProduction) return 'red'
  if (config.isStaging) return 'yellow'
  if (config.isTest) return 'purple'
  if (config.isDevelopment) return 'blue'
  return 'gray'
}

/**
 * Check if running in Vercel
 */
export function isVercel(): boolean {
  return process.env.VERCEL === '1'
}

/**
 * Check if running in CI
 */
export function isCI(): boolean {
  return process.env.CI === 'true'
}

/**
 * Require production environment or throw
 */
export function requireProduction(): void {
  if (!config.isProduction) {
    throw new Error('This operation is only allowed in production environment')
  }
}

/**
 * Block operation in production or throw
 */
export function blockInProduction(): void {
  if (config.isProduction && config.features.blockDirectProduction) {
    throw new Error('This operation is not allowed in production environment')
  }
}

/**
 * Get Supabase configuration based on environment
 */
export function getSupabaseConfig() {
  // In preview/staging, ensure we're using staging credentials
  if (config.isPreview || config.isStaging) {
    if (!config.database.url?.includes('staging') && 
        !config.database.url?.includes('localhost')) {
      console.warn('⚠️ Preview/Staging environment may be using production database!')
    }
  }
  
  return {
    url: config.database.url,
    anonKey: config.database.anonKey,
    serviceKey: config.database.serviceKey,
    options: {
      auth: {
        autoRefreshToken: !config.isTest,
        persistSession: true,
        detectSessionInUrl: !config.isTest,
      },
      global: {
        headers: {
          'x-environment': getEnvironmentName().toLowerCase(),
          'x-is-preview': config.isPreview ? 'true' : 'false',
        }
      }
    }
  }
}

/**
 * Log environment information (for debugging)
 */
export function logEnvironment(): void {
  if (config.features.debugMode) {
    console.log('🌍 Environment Configuration:', {
      name: getEnvironmentName(),
      isProduction: config.isProduction,
      isStaging: config.isStaging,
      isPreview: config.isPreview,
      vercelEnv: config.vercelEnv,
      features: config.features,
      supabaseUrl: config.database.url?.substring(0, 30) + '...',
    })
  }
}

// Auto-log in development/staging
if (typeof window !== 'undefined' && !config.isProduction) {
  logEnvironment()
}