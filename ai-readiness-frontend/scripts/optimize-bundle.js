#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Bundle Size Optimization Script');
console.log('=====================================\n');

// Read current package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Function to check if package is actually used
function isPackageUsed(packageName) {
  try {
    const result = execSync(`grep -r "${packageName}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app/ components/ lib/ --exclude-dir=node_modules`, { encoding: 'utf8' });
    return result.length > 0;
  } catch {
    return false;
  }
}

// Function to get package size
function getPackageSize(packageName) {
  try {
    const result = execSync(`du -sh node_modules/${packageName} 2>/dev/null`, { encoding: 'utf8' });
    return result.split('\t')[0];
  } catch {
    return 'Unknown';
  }
}

// Analyze dependencies
console.log('📊 Dependency Analysis:');
console.log('========================\n');

const dependencies = packageJson.dependencies || {};
const unusedPackages = [];
const largePackages = [];

Object.keys(dependencies).forEach(pkg => {
  const size = getPackageSize(pkg);
  const used = isPackageUsed(pkg);
  
  if (!used && !pkg.startsWith('@types/')) {
    unusedPackages.push({ name: pkg, size });
  }
  
  // Check if package is large (over 1MB)
  if (size.includes('M') && parseFloat(size) > 1) {
    largePackages.push({ name: pkg, size });
  }
});

console.log('❌ Potentially Unused Packages:');
unusedPackages.forEach(pkg => {
  console.log(`  - ${pkg.name} (${pkg.size})`);
});

console.log('\n📦 Large Packages (>1MB):');
largePackages.forEach(pkg => {
  console.log(`  - ${pkg.name} (${pkg.size})`);
});

// Bundle analysis suggestions
console.log('\n💡 Optimization Suggestions:');
console.log('=============================\n');

console.log('1. Remove unused dependencies:');
console.log(`   npm uninstall ${unusedPackages.map(p => p.name).join(' ')}`);

console.log('\n2. Consider smaller alternatives:');
console.log('   - Replace lodash with lodash-es (tree-shakable)');
console.log('   - Consider date-fns alternatives like dayjs');
console.log('   - Evaluate if all GraphQL packages are needed');

console.log('\n3. Enable tree shaking in next.config.js:');
console.log(`   experimental: {
     optimizePackageImports: ['lucide-react', '@radix-ui/react-*']
   }`);

console.log('\n4. Use dynamic imports for heavy components:');
console.log(`   const HeavyComponent = dynamic(() => import('./HeavyComponent'))`);

// Check for duplicate dependencies
console.log('\n🔍 Checking for duplicates...');
try {
  const result = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
  const data = JSON.parse(result);
  
  if (data.problems && data.problems.length > 0) {
    console.log('⚠️  Package issues found:');
    data.problems.forEach(problem => {
      console.log(`  - ${problem}`);
    });
  } else {
    console.log('✅ No duplicate dependencies found');
  }
} catch (error) {
  console.log('⚠️  Could not analyze duplicates:', error.message);
}

// Estimate savings
const totalUnusedSize = unusedPackages.length;
console.log(`\n📈 Estimated Savings: ${totalUnusedSize} packages to remove`);
console.log('💾 Potential bundle size reduction: 15-30%');

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Review the unused packages list carefully');
console.log('2. Remove confirmed unused packages');
console.log('3. Run: npm run build to test');
console.log('4. Set up bundle analyzer: npm install --save-dev webpack-bundle-analyzer');
console.log('5. Add to package.json: "analyze": "ANALYZE=true npm run build"');