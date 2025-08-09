import { NextRequest, NextResponse } from 'next/server'
import { config, getEnvironmentName } from '@/lib/config/environment'

/**
 * Debug endpoint to verify environment configuration
 * Only accessible in non-production or with admin token
 */
export async function GET(request: NextRequest) {
  // Security check - only allow in non-production or with admin token
  const adminToken = request.headers.get('x-admin-token')
  const migrationToken = process.env.MIGRATION_ADMIN_TOKEN
  
  if (config.isProduction && (!adminToken || !migrationToken || adminToken !== migrationToken)) {
    return NextResponse.json(
      { error: 'Forbidden - This endpoint is not available in production without proper authentication' },
      { status: 403 }
    )
  }
  
  // Sanitize URLs to not expose full credentials
  const sanitizeUrl = (url?: string) => {
    if (!url) return 'not configured'
    if (url.includes('supabase.co')) {
      return url.replace(/https:\/\/(.{8}).*\.supabase\.co/, 'https://$1******.supabase.co')
    }
    if (url.includes('localhost')) {
      return 'localhost:****'
    }
    return 'configured (hidden)'
  }
  
  const sanitizeKey = (key?: string) => {
    if (!key) return 'not configured'
    return key.substring(0, 10) + '...' + key.substring(key.length - 5)
  }
  
  // Check which environment variables are being used
  const usingStaging = {
    url: !!process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: !!process.env.STAGING_DATABASE_URL,
  }
  
  // Collect environment information
  const envInfo = {
    environment: {
      name: getEnvironmentName(),
      isProduction: config.isProduction,
      isStaging: config.isStaging,
      isDevelopment: config.isDevelopment,
      isTest: config.isTest,
      isPreview: config.isPreview,
    },
    vercel: {
      isVercel: process.env.VERCEL === '1',
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL ? 'configured' : 'not configured',
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    },
    supabase: {
      // Show which variables are actually being used
      activeConfig: {
        url: sanitizeUrl(config.database.url),
        anonKey: sanitizeKey(config.database.anonKey),
        serviceKey: config.database.serviceKey ? 'configured' : 'not configured',
        databaseUrl: config.database.directUrl ? 'configured' : 'not configured',
      },
      // Show available staging variables
      stagingVariables: usingStaging,
      // Show raw environment variables
      productionVariables: {
        url: sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKey: sanitizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not configured',
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
      },
      stagingVariablesRaw: {
        url: sanitizeUrl(process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL),
        anonKey: sanitizeKey(process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceKey: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not configured',
        databaseUrl: process.env.STAGING_DATABASE_URL ? 'configured' : 'not configured',
      },
    },
    features: config.features,
    node: {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    },
    warnings: [] as string[],
  }
  
  // Add warnings for potential misconfigurations
  if (config.isPreview || config.isStaging) {
    // Check if staging variables are available
    if (!usingStaging.url && !usingStaging.anonKey) {
      envInfo.warnings.push('⚠️ STAGING_* environment variables not found - using production variables!')
    }
    
    // Check if using production URL in preview/staging
    if (config.database.url?.includes('prod')) {
      envInfo.warnings.push('⚠️ Preview/Staging may be using production database URL!')
    }
    
    // Only warn if we're NOT using staging variables (the URL pattern check is not reliable)
    if (!usingStaging.url && !usingStaging.anonKey) {
      if (!config.database.url?.includes('staging') && 
          !config.database.url?.includes('localhost') &&
          !config.database.url?.includes('preview')) {
        envInfo.warnings.push('⚠️ Preview/Staging should use staging database URL')
      }
    }
  }
  
  if (config.isProduction) {
    // Check if using staging URL in production
    if (config.database.url?.includes('staging')) {
      envInfo.warnings.push('🚨 CRITICAL: Production is using staging database URL!')
    }
    
    // Check if debug mode is enabled
    if (config.features.debugMode) {
      envInfo.warnings.push('⚠️ Debug mode is enabled in production')
    }
    
    // Check if using staging variables in production
    if (usingStaging.url || usingStaging.anonKey) {
      envInfo.warnings.push('🚨 CRITICAL: Production should not have STAGING_* variables!')
    }
  }
  
  // Check for migration security (only important if not using dummy values)
  if (!process.env.MIGRATION_ADMIN_TOKEN && 
      !config.database.url?.includes('dummy-build')) {
    envInfo.warnings.push('⚠️ MIGRATION_ADMIN_TOKEN is not configured - migrations API is unprotected')
  }
  
  // Return environment information
  return NextResponse.json({
    ...envInfo,
    timestamp: new Date().toISOString(),
    message: envInfo.warnings.length > 0 
      ? `Environment configured with ${envInfo.warnings.length} warning(s) - review the warnings array` 
      : 'Environment properly configured',
    summary: {
      usingCorrectDatabase: (config.isPreview || config.isStaging) 
        ? (usingStaging.url || usingStaging.anonKey) 
        : (!usingStaging.url && !usingStaging.anonKey),
      hasStagingVariables: usingStaging.url && usingStaging.anonKey,
      currentDatabase: config.database.url?.includes('staging') ? 'staging' 
                    : config.database.url?.includes('localhost') ? 'local'
                    : config.database.url?.includes('prod') ? 'production'
                    : 'unknown',
    }
  }, {
    status: envInfo.warnings.some(w => w.includes('CRITICAL')) ? 500 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}