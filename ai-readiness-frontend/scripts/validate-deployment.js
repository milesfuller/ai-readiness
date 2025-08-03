#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 AI Readiness Deployment Validation');
console.log('=====================================\n');

const checks = [
  {
    name: '📋 Environment Variables',
    command: 'node',
    args: ['-e', `
      const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
      const missing = required.filter(key => !process.env[key]);
      if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing.join(', '));
        process.exit(1);
      } else {
        console.log('✅ All required environment variables are set');
      }
    `],
  },
  {
    name: '🏗️ Build Test',
    command: 'npm',
    args: ['run', 'build'],
  },
  {
    name: '🧪 Type Checking',
    command: 'npm',
    args: ['run', 'type-check'],
  },
  {
    name: '🎨 Linting',
    command: 'npm',
    args: ['run', 'lint'],
  },
  {
    name: '🔒 Security Scan',
    command: 'npm',
    args: ['run', 'test:security'],
  },
  {
    name: '🧪 Unit Tests',
    command: 'npm',
    args: ['run', 'test:unit'],
  },
];

async function runCheck(check) {
  return new Promise((resolve) => {
    console.log(`\n${check.name}`);
    console.log('-'.repeat(40));
    
    const start = Date.now();
    const proc = spawn(check.command, check.args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`✅ ${check.name} passed (${duration}s)`);
        resolve(true);
      } else {
        console.log(`❌ ${check.name} failed (${duration}s)`);
        resolve(false);
      }
    });
  });
}

async function runValidation() {
  const results = [];
  
  for (const check of checks) {
    const passed = await runCheck(check);
    results.push({ name: check.name, passed });
  }
  
  console.log('\n\n📊 Validation Summary');
  console.log('===================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed checks:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All validation checks passed! Ready for deployment.');
    
    // Write validation report
    const report = {
      timestamp: new Date().toISOString(),
      passed: passed,
      failed: failed,
      checks: results,
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Validation report saved to validation-report.json');
  }
}

// Run validation
runValidation().catch(console.error);