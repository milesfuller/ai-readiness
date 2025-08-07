import { ensureMigrationsRun } from '@/lib/db/auto-migrate'

/**
 * Server Component that runs migrations on app startup
 * This runs once when the app starts or deploys
 */
export default async function MigrationRunner() {
  // Run migrations on server-side only
  if (typeof window === 'undefined') {
    await ensureMigrationsRun()
  }
  
  // This component doesn't render anything
  return null
}