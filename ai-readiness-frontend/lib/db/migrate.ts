/**
 * Automatic Database Migration System
 * Runs migrations automatically on app startup in production
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

// Migration list in order
const MIGRATIONS = [
  '000_migration_tracking.sql',
  '001_invitations_schema.sql',
  '20240101000005_onboarding_tables.sql',
  '20240807_survey_system.sql',
  '20241207_organization_settings.sql',
  '20250107_survey_templates.sql'
]

export interface MigrationResult {
  version: string
  status: 'applied' | 'skipped' | 'failed'
  error?: string
  executionTime?: number
}

class DatabaseMigrator {
  private supabase: any
  private results: MigrationResult[] = []

  constructor() {
    // Use staging variables if in preview/staging environment
    const isPreviewOrStaging = process.env.VERCEL_ENV === 'preview' || 
                               process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
                               process.env.NEXT_PUBLIC_IS_PREVIEW === 'true'
    
    const supabaseUrl = isPreviewOrStaging && process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
      ? process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_URL
      
    const supabaseKey = isPreviewOrStaging && process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY
      ? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY
      : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials not found, migrations will be skipped')
      console.warn('Environment:', {
        isPreviewOrStaging,
        vercelEnv: process.env.VERCEL_ENV,
        hasStaging: !!process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
      })
      return
    }

    console.log('🔧 Migration database:', supabaseUrl.replace(/https:\/\/(.{8}).*\.supabase\.co/, 'https://$1******.supabase.co'))
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Check if a migration has already been applied
   */
  private async isMigrationApplied(version: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .eq('version', version)
        .single()

      return !error && data !== null
    } catch {
      // Table might not exist yet
      return false
    }
  }

  /**
   * Record a successful migration
   */
  private async recordMigration(version: string, executionTime: number): Promise<void> {
    try {
      await this.supabase
        .from('schema_migrations')
        .insert({
          version,
          description: `Migration ${version}`,
          execution_time_ms: executionTime,
          applied_at: new Date().toISOString()
        })
    } catch (error) {
      console.error(`Failed to record migration ${version}:`, error)
    }
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(filename: string): Promise<MigrationResult> {
    const version = filename.replace('.sql', '')
    const startTime = Date.now()

    try {
      // Check if already applied
      const isApplied = await this.isMigrationApplied(version)
      if (isApplied) {
        console.log(`⏭️  Migration ${version} already applied, skipping...`)
        return { version, status: 'skipped' }
      }

      // Get migration SQL content
      let sql: string
      
      // Import migrations from embedded content (works in both dev and prod)
      const { MIGRATION_CONTENT } = await import('./migrations-content')
      sql = MIGRATION_CONTENT[filename]
      
      if (!sql) {
        // Fallback to filesystem in development only
        if (process.env.NODE_ENV !== 'production') {
          const filepath = path.join(MIGRATIONS_DIR, filename)
          if (fs.existsSync(filepath)) {
            sql = fs.readFileSync(filepath, 'utf8')
          }
        }
        
        if (!sql) {
          console.warn(`⚠️ Migration ${filename} not found, skipping...`)
          return { version, status: 'skipped' }
        }
      }

      // Execute migration
      console.log(`📝 Applying migration: ${version}`)
      
      // Supabase doesn't have a direct SQL execution method in the JS client
      // We need to use RPC or create a database function
      const { error } = await this.supabase.rpc('exec_migration', { 
        migration_sql: sql,
        migration_version: version 
      })

      if (error) throw error

      const executionTime = Date.now() - startTime
      
      // Record successful migration
      await this.recordMigration(version, executionTime)
      
      console.log(`✅ Migration ${version} applied successfully (${executionTime}ms)`)
      return { version, status: 'applied', executionTime }

    } catch (error) {
      console.error(`❌ Migration ${version} failed:`, error)
      return { 
        version, 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }


  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<MigrationResult[]> {
    if (!this.supabase) {
      console.log('⏭️  Skipping migrations (no database connection)')
      return []
    }

    console.log('🚀 Starting automatic database migrations...')
    
    for (const migration of MIGRATIONS) {
      const result = await this.executeMigration(migration)
      this.results.push(result)
      
      // Stop on critical failure (first migration must succeed)
      if (result.status === 'failed' && migration === '000_migration_tracking.sql') {
        console.error('❌ Critical migration failed, stopping migration process')
        break
      }
    }

    // Summary
    const applied = this.results.filter(r => r.status === 'applied').length
    const skipped = this.results.filter(r => r.status === 'skipped').length
    const failed = this.results.filter(r => r.status === 'failed').length

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Applied: ${applied}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`)
    }

    return this.results
  }

  /**
   * Get migration status
   */
  public async getStatus(): Promise<any[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase
        .from('schema_migrations')
        .select('*')
        .order('applied_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get migration status:', error)
      return []
    }
  }
}

// Singleton instance
let migrator: DatabaseMigrator | null = null

/**
 * Get or create migrator instance
 */
export function getMigrator(): DatabaseMigrator {
  if (!migrator) {
    migrator = new DatabaseMigrator()
  }
  return migrator
}

/**
 * Run migrations (call this on app startup)
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  const migrator = getMigrator()
  return await migrator.runMigrations()
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<any[]> {
  const migrator = getMigrator()
  return await migrator.getStatus()
}