#!/usr/bin/env node
/**
 * Database Migration Runner
 * Automatically runs all SQL migrations in order
 * 
 * Usage: 
 *   npm run migrate
 *   or
 *   node scripts/run-migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key (has admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Define migrations in order
const migrations = [
  '001_invitations_schema.sql',
  '20240101000005_onboarding_tables.sql', 
  '20240807_survey_system.sql',
  '20241207_organization_settings.sql',
  '20250107_survey_templates.sql'
];

async function runMigration(filename) {
  const filepath = path.join(__dirname, '../supabase/migrations', filename);
  
  try {
    console.log(`📝 Running migration: ${filename}`);
    
    // Read SQL file
    const sql = fs.readFileSync(filepath, 'utf8');
    
    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query (Note: this requires admin access)
      // For production, you might need to run these manually in Supabase Dashboard
      console.error(`⚠️  Migration ${filename} requires manual execution in Supabase Dashboard`);
      console.error('   Error:', error.message);
      return false;
    }
    
    console.log(`✅ Migration ${filename} completed successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to run migration ${filename}:`, err.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. You may need to run them manually in the Supabase Dashboard.');
    console.log('   Go to: SQL Editor in your Supabase project');
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

// Run migrations
runAllMigrations().catch(console.error);