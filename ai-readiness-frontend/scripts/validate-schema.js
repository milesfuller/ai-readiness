#!/usr/bin/env node
/**
 * DATABASE SCHEMA VALIDATION SCRIPT
 * 
 * Validates database schema integrity and compatibility
 * Run: node scripts/validate-schema.js
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateSchemaStructure() {
  log('blue', 'Validating database schema structure...');
  
  try {
    // This is a simplified validation - in a real app you'd parse the TS file
    const schemaContent = fs.readFileSync('contracts/database.ts', 'utf8');
    
    const validations = [
      {
        name: 'User Schema',
        pattern: /export const UsersTableSchema/,
        required: true
      },
      {
        name: 'Survey Schema',
        pattern: /export const SurveysTableSchema/,
        required: true
      },
      {
        name: 'Question Schema', 
        pattern: /export const QuestionsTableSchema/,
        required: true
      },
      {
        name: 'Response Schema',
        pattern: /export const ResponsesTableSchema/,
        required: true
      },
      {
        name: 'Foreign Key Constraints',
        pattern: /export const ForeignKeyConstraints/,
        required: true
      },
      {
        name: 'Database Indexes',
        pattern: /export const DatabaseIndexes/,
        required: true
      }
    ];

    let allValid = true;

    for (const validation of validations) {
      if (validation.pattern.test(schemaContent)) {
        log('green', `✅ ${validation.name} found`);
      } else {
        log('red', `❌ ${validation.name} missing`);
        allValid = false;
      }
    }

    return allValid;

  } catch (error) {
    log('red', `❌ Error reading schema file: ${error.message}`);
    return false;
  }
}

function validateConstraintConsistency() {
  log('blue', 'Validating constraint consistency...');
  
  try {
    const schemaContent = fs.readFileSync('contracts/database.ts', 'utf8');
    
    // Check for common issues
    const issues = [];
    
    // Check for UUID pattern consistency
    const uuidRegex = /z\.string\(\)\.uuid\(\)/g;
    const uuidMatches = schemaContent.match(uuidRegex) || [];
    
    if (uuidMatches.length < 5) {
      issues.push('Insufficient UUID fields - ensure all ID fields use z.string().uuid()');
    }
    
    // Check for timestamp consistency
    const timestampPattern = /TimestampSchema/g;
    const timestampMatches = schemaContent.match(timestampPattern) || [];
    
    if (timestampMatches.length < 5) {
      issues.push('Insufficient timestamp schemas - ensure all tables extend TimestampSchema');
    }
    
    // Check for enum definitions
    const enumPattern = /z\.enum\(/g;
    const enumMatches = schemaContent.match(enumPattern) || [];
    
    if (enumMatches.length < 3) {
      issues.push('Insufficient enum definitions - ensure status fields use z.enum()');
    }

    if (issues.length === 0) {
      log('green', '✅ All constraints are consistent');
      return true;
    } else {
      log('yellow', '⚠️ Constraint issues detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

  } catch (error) {
    log('red', `❌ Error validating constraints: ${error.message}`);
    return false;
  }
}

function validateIndexStrategy() {
  log('blue', 'Validating database index strategy...');
  
  try {
    const schemaContent = fs.readFileSync('contracts/database.ts', 'utf8');
    
    // Check for essential indexes
    const essentialIndexes = [
      'email', // User lookups
      'survey_id', // Survey relationships
      'user_id', // User relationships
      'created_at', // Temporal queries
      'status' // Status filtering
    ];
    
    let missingIndexes = [];
    
    for (const index of essentialIndexes) {
      const pattern = new RegExp(`'${index}'`, 'g');
      if (!pattern.test(schemaContent)) {
        missingIndexes.push(index);
      }
    }
    
    if (missingIndexes.length === 0) {
      log('green', '✅ Essential indexes are defined');
      return true;
    } else {
      log('yellow', '⚠️ Missing recommended indexes:');
      missingIndexes.forEach(index => console.log(`   - ${index}`));
      return false;
    }

  } catch (error) {
    log('red', `❌ Error validating indexes: ${error.message}`);
    return false;
  }
}

function validateMigrationSupport() {
  log('blue', 'Validating migration support...');
  
  try {
    const schemaContent = fs.readFileSync('contracts/database.ts', 'utf8');
    
    const migrationFeatures = [
      {
        name: 'Migration Script Interface',
        pattern: /interface MigrationScript/
      },
      {
        name: 'Base Migration Queries',
        pattern: /export const BaseMigrationQueries/
      },
      {
        name: 'UUID Extension',
        pattern: /CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/
      },
      {
        name: 'Updated At Trigger',
        pattern: /update_updated_at_column/
      }
    ];

    let allSupported = true;

    for (const feature of migrationFeatures) {
      if (feature.pattern.test(schemaContent)) {
        log('green', `✅ ${feature.name} supported`);
      } else {
        log('red', `❌ ${feature.name} missing`);
        allSupported = false;
      }
    }

    return allSupported;

  } catch (error) {
    log('red', `❌ Error validating migration support: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🗄️ Database Schema Validation\n');
  
  const validations = [
    { name: 'Schema Structure', fn: validateSchemaStructure },
    { name: 'Constraint Consistency', fn: validateConstraintConsistency },
    { name: 'Index Strategy', fn: validateIndexStrategy },
    { name: 'Migration Support', fn: validateMigrationSupport }
  ];

  let allPassed = true;
  let criticalFailed = false;

  for (const validation of validations) {
    console.log(`\n${colors.blue}=== ${validation.name} ===${colors.reset}`);
    
    try {
      const passed = validation.fn();
      if (!passed) {
        allPassed = false;
        // Schema structure is critical, others are warnings
        if (validation.name === 'Schema Structure') {
          criticalFailed = true;
        }
      }
    } catch (error) {
      log('red', `❌ ${validation.name} failed: ${error.message}`);
      allPassed = false;
      if (validation.name === 'Schema Structure') {
        criticalFailed = true;
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  
  if (criticalFailed) {
    log('red', '❌ CRITICAL SCHEMA VALIDATION FAILURES');
    log('red', 'Database schema is invalid - fix immediately');
    process.exit(1);
  } else if (!allPassed) {
    log('yellow', '⚠️ SCHEMA VALIDATION WARNINGS');
    log('yellow', 'Schema is functional but has optimization opportunities');
    process.exit(0);
  } else {
    log('green', '✅ ALL SCHEMA VALIDATIONS PASSED');
    log('green', 'Database schema is valid and optimized');
    process.exit(0);
  }
}

// Run the validation
main();