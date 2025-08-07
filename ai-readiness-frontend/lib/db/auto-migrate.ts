/**
 * Automatic Migration Runner
 * This runs migrations automatically when the app starts
 */

import { runMigrations } from './migrate'

let migrationPromise: Promise<void> | null = null
let hasMigrated = false

/**
 * Run migrations once on app startup
 * This is called from the root layout or app initialization
 */
export async function ensureMigrationsRun(): Promise<void> {
  // Only run once per app instance
  if (hasMigrated) return
  
  // Prevent multiple concurrent migration attempts
  if (migrationPromise) {
    await migrationPromise
    return
  }

  migrationPromise = (async () => {
    try {
      // Skip in development if flag is set
      if (process.env.SKIP_AUTO_MIGRATIONS === 'true') {
        console.log('⏭️  Auto-migrations disabled via SKIP_AUTO_MIGRATIONS')
        return
      }

      // Only run migrations on server-side
      if (typeof window !== 'undefined') {
        return
      }

      console.log('🔄 Checking database migrations...')
      const startTime = Date.now()
      
      const results = await runMigrations()
      
      const elapsed = Date.now() - startTime
      const applied = results.filter(r => r.status === 'applied').length
      
      if (applied > 0) {
        console.log(`✅ Applied ${applied} migrations in ${elapsed}ms`)
      } else {
        console.log('✅ Database is up to date')
      }
      
      hasMigrated = true
    } catch (error) {
      // Log error but don't crash the app
      console.error('❌ Migration error (non-fatal):', error)
      console.error('The app will continue but database might be out of date')
      
      // In production, you might want to send this to error tracking
      if (process.env.NODE_ENV === 'production') {
        // Send to Sentry, LogRocket, etc.
      }
    }
  })()

  await migrationPromise
}

/**
 * Reset migration state (useful for testing)
 */
export function resetMigrationState(): void {
  hasMigrated = false
  migrationPromise = null
}