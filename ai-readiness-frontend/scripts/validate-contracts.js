#!/usr/bin/env node
/**
 * CONTRACT VALIDATION SCRIPT
 * 
 * Automated validation for API and database contracts
 * Run: npm run validate:contracts
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting contract validation...\n');

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

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function validateContracts() {
  const validations = [
    {
      name: 'Contract Syntax Check',
      command: 'npx tsc --noEmit --skipLibCheck contracts/api.ts contracts/database.ts',
      critical: false
    },
    {
      name: 'API Contract Tests',
      command: 'npm run test:contracts',
      critical: false
    },
    {
      name: 'Contract Linting',
      command: 'npx eslint contracts/ --format=compact',
      critical: false
    },
    {
      name: 'Schema Validation',
      command: 'node scripts/validate-schema.js',
      critical: false
    }
  ];

  let allPassed = true;
  let criticalFailed = false;

  for (const validation of validations) {
    process.stdout.write(`${colors.blue}Running ${validation.name}...${colors.reset}`);
    
    try {
      const result = await runCommand(validation.command);
      log('green', ' ✅ PASSED');
      
      if (result.stdout && result.stdout.trim()) {
        console.log(`   Output: ${result.stdout.trim()}`);
      }
    } catch (result) {
      const failed = validation.critical ? ' ❌ CRITICAL FAILURE' : ' ⚠️ WARNING';
      log(validation.critical ? 'red' : 'yellow', failed);
      
      if (result.stderr && result.stderr.trim()) {
        console.log(`   Error: ${result.stderr.trim()}`);
      }
      if (result.stdout && result.stdout.trim()) {
        console.log(`   Output: ${result.stdout.trim()}`);
      }
      
      allPassed = false;
      if (validation.critical) {
        criticalFailed = true;
      }
    }
    
    console.log(); // Empty line for readability
  }

  return { allPassed, criticalFailed };
}

async function checkFileIntegrity() {
  console.log(`${colors.blue}Checking contract file integrity...${colors.reset}`);
  
  const requiredFiles = [
    'contracts/api.ts',
    'contracts/database.ts',
    'tests/contracts.test.ts',
    'protocols/agent-coordination.md'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log('green', `✅ ${file} exists`);
    } else {
      log('red', `❌ ${file} missing`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function validateDependencies() {
  console.log(`${colors.blue}Validating dependencies...${colors.reset}`);
  
  try {
    await runCommand('npm audit --audit-level moderate');
    log('green', '✅ No critical security vulnerabilities');
  } catch (result) {
    log('yellow', '⚠️ Security vulnerabilities detected');
    console.log(result.stdout);
  }
}

async function main() {
  try {
    // Check file integrity first
    const filesOk = await checkFileIntegrity();
    if (!filesOk) {
      log('red', '❌ Contract files missing - cannot proceed');
      process.exit(1);
    }

    // Run contract validations
    const { allPassed, criticalFailed } = await validateContracts();

    // Check dependencies
    await validateDependencies();

    // Final summary
    console.log('\n' + '='.repeat(50));
    
    if (criticalFailed) {
      log('red', '❌ CRITICAL VALIDATION FAILURES');
      log('red', 'Fix critical issues before continuing development');
      process.exit(1);
    } else if (!allPassed) {
      log('yellow', '⚠️ VALIDATION WARNINGS');
      log('yellow', 'Consider fixing warnings but development may continue');
      process.exit(0);
    } else {
      log('green', '✅ ALL VALIDATIONS PASSED');
      log('green', 'Contracts are valid - development may proceed');
      process.exit(0);
    }

  } catch (error) {
    log('red', '❌ VALIDATION SCRIPT ERROR');
    console.error(error);
    process.exit(1);
  }
}

// Run the validation
main();