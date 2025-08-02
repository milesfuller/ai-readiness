import { createAdminSupabaseClient } from '../supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Database setup and migration utilities
export class DatabaseSetup {
  private static supabase = createAdminSupabaseClient()

  // Run all migrations in order
  static async runMigrations(): Promise<void> {
    console.log('Starting database migrations...')

    const migrations = [
      '001_initial_schema.sql',
      '002_indexes_and_rls.sql',
      '003_triggers_and_functions.sql'
    ]

    for (const migration of migrations) {
      try {
        console.log(`Running migration: ${migration}`)
        const migrationPath = join(process.cwd(), 'supabase', 'migrations', migration)
        const migrationSql = readFileSync(migrationPath, 'utf8')
        
        await this.executeSql(migrationSql)
        console.log(`✅ Migration ${migration} completed successfully`)
      } catch (error) {
        console.error(`❌ Migration ${migration} failed:`, error)
        throw error
      }
    }

    console.log('All migrations completed successfully!')
  }

  // Run seed data
  static async runSeeds(): Promise<void> {
    console.log('Starting database seeding...')

    const seeds = [
      '001_default_survey.sql'
    ]

    for (const seed of seeds) {
      try {
        console.log(`Running seed: ${seed}`)
        const seedPath = join(process.cwd(), 'supabase', 'seeds', seed)
        const seedSql = readFileSync(seedPath, 'utf8')
        
        await this.executeSql(seedSql)
        console.log(`✅ Seed ${seed} completed successfully`)
      } catch (error) {
        console.error(`❌ Seed ${seed} failed:`, error)
        throw error
      }
    }

    console.log('All seeds completed successfully!')
  }

  // Execute raw SQL
  private static async executeSql(sql: string): Promise<void> {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await this.supabase.rpc('exec', { 
          sql: statement + ';' 
        })

        if (error) {
          console.error('SQL Error:', error)
          console.error('Statement:', statement)
          throw new Error(`SQL execution failed: ${error.message}`)
        }
      }
    }
  }

  // Check if database is properly set up
  static async checkDatabaseSetup(): Promise<{
    isSetup: boolean
    missingTables: string[]
    issues: string[]
  }> {
    const requiredTables = [
      'organizations',
      'profiles',
      'surveys',
      'survey_questions',
      'survey_sessions',
      'survey_responses',
      'response_analysis',
      'organization_insights',
      'audit_log',
      'api_usage_log',
      'system_notifications'
    ]

    const missingTables: string[] = []
    const issues: string[] = []

    try {
      // Check if tables exist
      for (const table of requiredTables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('count(*)')
          .limit(1)

        if (error) {
          missingTables.push(table)
        }
      }

      // Check if RLS is enabled
      const { data: rlsStatus, error: rlsError } = await this.supabase.rpc('exec', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN (${requiredTables.map(t => `'${t}'`).join(',')})
        `
      })

      if (rlsError) {
        issues.push('Cannot check RLS status')
      } else {
        const tablesWithoutRLS = rlsStatus?.filter((row: any) => !row.rowsecurity)
        if (tablesWithoutRLS?.length > 0) {
          issues.push(`RLS not enabled on: ${tablesWithoutRLS.map((r: any) => r.tablename).join(', ')}`)
        }
      }

      // Check if functions exist
      const requiredFunctions = [
        'get_user_role',
        'is_admin',
        'is_org_admin',
        'calculate_readiness_score',
        'cleanup_expired_sessions'
      ]

      for (const func of requiredFunctions) {
        const { error } = await this.supabase.rpc(func)
        if (error && !error.message.includes('function does not exist')) {
          // Function exists but might have parameter issues, which is fine
        } else if (error?.message.includes('function does not exist')) {
          issues.push(`Missing function: ${func}`)
        }
      }

      return {
        isSetup: missingTables.length === 0 && issues.length === 0,
        missingTables,
        issues
      }
    } catch (error) {
      return {
        isSetup: false,
        missingTables: requiredTables,
        issues: [`Database connection failed: ${error}`]
      }
    }
  }

  // Initialize database with migrations and seeds
  static async initializeDatabase(): Promise<void> {
    console.log('Initializing database...')

    const status = await this.checkDatabaseSetup()
    
    if (status.isSetup) {
      console.log('✅ Database is already set up')
      return
    }

    console.log('Database setup required...')
    console.log('Missing tables:', status.missingTables)
    console.log('Issues:', status.issues)

    try {
      await this.runMigrations()
      await this.runSeeds()

      // Verify setup
      const finalStatus = await this.checkDatabaseSetup()
      
      if (finalStatus.isSetup) {
        console.log('✅ Database initialization completed successfully!')
      } else {
        console.log('⚠️ Database initialization completed with issues:')
        console.log('Missing tables:', finalStatus.missingTables)
        console.log('Issues:', finalStatus.issues)
      }
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  // Reset database (DANGER: This will delete all data)
  static async resetDatabase(): Promise<void> {
    console.log('⚠️ RESETTING DATABASE - ALL DATA WILL BE LOST')

    const tables = [
      'segment_insights',
      'organization_insights',
      'response_analysis',
      'survey_responses',
      'survey_sessions',
      'survey_questions',
      'surveys',
      'system_notifications',
      'api_usage_log',
      'audit_log',
      'profiles',
      'organizations'
    ]

    // Drop tables in reverse order to handle foreign key constraints
    for (const table of tables) {
      try {
        await this.executeSql(`DROP TABLE IF EXISTS ${table} CASCADE;`)
        console.log(`Dropped table: ${table}`)
      } catch (error) {
        console.error(`Failed to drop table ${table}:`, error)
      }
    }

    // Drop functions
    const functions = [
      'get_user_role',
      'is_admin',
      'is_org_admin',
      'update_updated_at_column',
      'handle_new_user',
      'update_session_stats',
      'calculate_readiness_score',
      'generate_session_summary',
      'cleanup_expired_sessions',
      'validate_survey_response'
    ]

    for (const func of functions) {
      try {
        await this.executeSql(`DROP FUNCTION IF EXISTS ${func}() CASCADE;`)
        console.log(`Dropped function: ${func}`)
      } catch (error) {
        console.error(`Failed to drop function ${func}:`, error)
      }
    }

    // Drop views
    const views = [
      'survey_progress_view',
      'organization_analytics_view',
      'response_analysis_summary_view'
    ]

    for (const view of views) {
      try {
        await this.executeSql(`DROP VIEW IF EXISTS ${view} CASCADE;`)
        console.log(`Dropped view: ${view}`)
      } catch (error) {
        console.error(`Failed to drop view ${view}:`, error)
      }
    }

    console.log('Database reset completed')
  }

  // Create a test organization and survey
  static async createTestData(): Promise<{
    organizationId: string
    surveyId: string
  }> {
    console.log('Creating test data...')

    try {
      // Create test organization
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: 'test-org',
          description: 'Test organization for development',
          industry: 'Technology',
          size_category: 'medium',
          contact_email: 'test@example.com',
          contact_name: 'Test Admin',
          subscription_tier: 'free',
          is_active: true
        })
        .select()
        .single()

      if (orgError) {
        throw new Error(`Failed to create test organization: ${orgError.message}`)
      }

      // Clone default survey template for the test organization
      const { data: surveys, error: surveysError } = await this.supabase
        .from('surveys')
        .select('id')
        .eq('is_template', true)
        .limit(1)

      if (surveysError || !surveys || surveys.length === 0) {
        throw new Error('No survey template found')
      }

      const templateId = surveys[0].id

      // Create survey for test organization
      const { data: survey, error: surveyError } = await this.supabase
        .from('surveys')
        .insert({
          organization_id: org.id,
          title: 'Test AI Readiness Assessment',
          description: 'Test survey for development purposes',
          version: '1.0',
          question_count: 12,
          estimated_duration_minutes: 20,
          is_voice_enabled: true,
          is_anonymous: false,
          status: 'active',
          is_template: false
        })
        .select()
        .single()

      if (surveyError) {
        throw new Error(`Failed to create test survey: ${surveyError.message}`)
      }

      // Copy questions from template
      const { data: templateQuestions, error: questionsError } = await this.supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', templateId)

      if (questionsError) {
        throw new Error(`Failed to get template questions: ${questionsError.message}`)
      }

      if (templateQuestions && templateQuestions.length > 0) {
        const questionsData = templateQuestions.map(q => ({
          survey_id: survey.id,
          question_number: q.question_number,
          question_text: q.question_text,
          question_context: q.question_context,
          placeholder_text: q.placeholder_text,
          jtbd_force: q.jtbd_force,
          force_description: q.force_description,
          input_type: q.input_type,
          is_required: q.is_required,
          max_length: q.max_length,
          min_length: q.min_length,
          options: q.options,
          order_index: q.order_index,
          is_active: q.is_active
        }))

        const { error: insertQuestionsError } = await this.supabase
          .from('survey_questions')
          .insert(questionsData)

        if (insertQuestionsError) {
          throw new Error(`Failed to create test questions: ${insertQuestionsError.message}`)
        }
      }

      console.log('✅ Test data created successfully')
      console.log(`Organization ID: ${org.id}`)
      console.log(`Survey ID: ${survey.id}`)

      return {
        organizationId: org.id,
        surveyId: survey.id
      }
    } catch (error) {
      console.error('❌ Failed to create test data:', error)
      throw error
    }
  }

  // Validate data integrity
  static async validateDataIntegrity(): Promise<{
    isValid: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // Check for orphaned records
      const { data: orphanedSessions, error: sessionsError } = await this.supabase
        .from('survey_sessions')
        .select('id')
        .is('survey_id', null)

      if (sessionsError) {
        issues.push(`Cannot check orphaned sessions: ${sessionsError.message}`)
      } else if (orphanedSessions && orphanedSessions.length > 0) {
        issues.push(`Found ${orphanedSessions.length} orphaned survey sessions`)
      }

      // Check for responses without sessions
      const { data: orphanedResponses, error: responsesError } = await this.supabase
        .from('survey_responses')
        .select('id')
        .is('session_id', null)

      if (responsesError) {
        issues.push(`Cannot check orphaned responses: ${responsesError.message}`)
      } else if (orphanedResponses && orphanedResponses.length > 0) {
        issues.push(`Found ${orphanedResponses.length} orphaned survey responses`)
      }

      // Check for analysis without responses
      const { data: orphanedAnalysis, error: analysisError } = await this.supabase
        .from('response_analysis')
        .select('id')
        .is('response_id', null)

      if (analysisError) {
        issues.push(`Cannot check orphaned analysis: ${analysisError.message}`)
      } else if (orphanedAnalysis && orphanedAnalysis.length > 0) {
        issues.push(`Found ${orphanedAnalysis.length} orphaned response analysis`)
      }

      return {
        isValid: issues.length === 0,
        issues
      }
    } catch (error) {
      return {
        isValid: false,
        issues: [`Data integrity check failed: ${error}`]
      }
    }
  }
}