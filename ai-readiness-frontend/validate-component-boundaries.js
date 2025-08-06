#!/usr/bin/env node

/**
 * Component Boundaries Validation Script
 * 
 * This script validates that the component boundary test setup is correct
 * and provides instructions for running the tests.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Component Boundaries Test Setup...\n');

// Check if test file exists
const testFile = path.join(__dirname, 'e2e', 'component-boundaries.spec.ts');
if (!fs.existsSync(testFile)) {
  console.error('❌ component-boundaries.spec.ts not found');
  process.exit(1);
}
console.log('✅ component-boundaries.spec.ts found');

// Check if key source files exist
const filesToCheck = [
  'app/dashboard/page.tsx',
  'app/auth/login/page.tsx', 
  'lib/supabase/client.ts',
  'lib/supabase/client-browser.ts',
  'lib/supabase/singleton.ts',
  'components/ui/whimsy.tsx',
  'lib/auth/context.tsx'
];

let allFilesExist = true;
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} found`);
  } else {
    console.log(`⚠️  ${file} not found (optional)`);
  }
});

// Check package.json for test scripts
const packageJson = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJson)) {
  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  
  if (pkg.scripts && pkg.scripts['test:e2e']) {
    console.log('✅ test:e2e script found');
  } else {
    console.log('⚠️  test:e2e script not found in package.json');
  }
  
  const hasPlaywright = pkg.devDependencies && pkg.devDependencies['@playwright/test'];
  if (hasPlaywright) {
    console.log('✅ @playwright/test dependency found');
  } else {
    console.log('❌ @playwright/test dependency missing');
    allFilesExist = false;
  }
} else {
  console.log('❌ package.json not found');
  allFilesExist = false;
}

// Check playwright config
const playwrightConfigs = ['playwright.config.ts', 'playwright.config.js'];
let configFound = false;
playwrightConfigs.forEach(config => {
  const configPath = path.join(__dirname, config);
  if (fs.existsSync(configPath)) {
    console.log(`✅ ${config} found`);
    configFound = true;
  }
});

if (!configFound) {
  console.log('❌ Playwright config not found');
  allFilesExist = false;
}

console.log('\n📋 Test Categories Available:');
console.log('   1. Dashboard Client Component Issues (5 tests)');
console.log('   2. Login Redirect Flow (3 tests)'); 
console.log('   3. Client Component Interactivity (3 tests)');
console.log('   4. Supabase Client Singleton Issues (2 tests)');
console.log('   5. Function Passing and Serialization (2 tests)');
console.log('   6. Error Boundary and Recovery (2 tests)');
console.log('   7. Performance and Memory (2 tests)');
console.log('   Total: 17 tests across all categories');

console.log('\n🚀 How to Run the Tests:');
console.log('\n   Prerequisites:');
console.log('   1. Start the development server: npm run dev');
console.log('   2. Ensure environment variables are set (NEXT_PUBLIC_SUPABASE_URL, etc.)');
console.log('   3. Install dependencies: npm install');

console.log('\n   Run All Tests:');
console.log('   npm run test:e2e component-boundaries.spec.ts');

console.log('\n   Run Specific Categories:');
console.log('   npx playwright test component-boundaries.spec.ts -g "Dashboard Client Component Issues"');
console.log('   npx playwright test component-boundaries.spec.ts -g "Login Redirect Flow"');
console.log('   npx playwright test component-boundaries.spec.ts -g "Supabase Client Singleton"');

console.log('\n   Debug Mode (Browser Visible):');
console.log('   npx playwright test component-boundaries.spec.ts --headed --debug');

console.log('\n   Run on Specific Browser:');
console.log('   npx playwright test component-boundaries.spec.ts --project=chromium');

console.log('\n🎯 What These Tests Detect:');
console.log('   ✓ useState/useEffect errors in server components');
console.log('   ✓ "Functions cannot be passed directly" serialization errors');
console.log('   ✓ Multiple Supabase GoTrueClient instances warnings');
console.log('   ✓ Hydration mismatches between server/client rendering');
console.log('   ✓ Authentication flow and redirect issues');
console.log('   ✓ Client component interactivity problems');
console.log('   ✓ Memory leaks from improper component cleanup');
console.log('   ✓ Error boundary and recovery mechanisms');

console.log('\n📊 Expected Results:');
console.log('   ✅ All tests pass = No component boundary issues');
console.log('   ❌ Tests fail = Review console output for specific errors');

if (allFilesExist) {
  console.log('\n🎉 Setup validation complete! All required files found.');
  console.log('\n   Next steps:');
  console.log('   1. Start your dev server: npm run dev');
  console.log('   2. Run the tests: npm run test:e2e component-boundaries.spec.ts');
} else {
  console.log('\n⚠️  Some issues found. Please review the missing files above.');
}

console.log('\n📚 For detailed information, see: COMPONENT_BOUNDARIES_TEST_GUIDE.md');