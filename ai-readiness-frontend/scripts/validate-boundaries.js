#!/usr/bin/env node

/**
 * Pre-Deployment Component Boundary Validator
 * Validates Next.js server/client component boundaries before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class ComponentBoundaryValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.isCI = process.env.CI === 'true';
    this.exitCode = 0;
    this.scannedFiles = 0;
    this.componentFiles = [];
  }

  log(message, color = 'reset') {
    if (!this.isCI) {
      console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
      console.log(message);
    }
  }

  error(message, file = '') {
    const errorMsg = file ? `${file}: ${message}` : message;
    this.errors.push(errorMsg);
    this.log(`❌ ERROR: ${errorMsg}`, 'red');
  }

  warning(message, file = '') {
    const warningMsg = file ? `${file}: ${message}` : message;
    this.warnings.push(warningMsg);
    this.log(`⚠️  WARNING: ${warningMsg}`, 'yellow');
  }

  success(message) {
    this.successes.push(message);
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'cyan');
  }

  // Get all React component files
  getComponentFiles(dir) {
    const files = [];
    
    const scanDir = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip node_modules, .next, coverage, etc.
            if (!['node_modules', '.next', 'coverage', '.git', 'build', 'dist'].includes(item)) {
              scanDir(fullPath);
            }
          } else if (stat.isFile()) {
            // Check for React component files
            if (/\.(tsx?|jsx?)$/.test(item) && 
                !item.includes('.test.') && 
                !item.includes('.spec.')) {
              files.push(fullPath);
            }
          }
        });
      } catch (err) {
        this.warning(`Could not scan directory ${currentDir}: ${err.message}`);
      }
    };

    scanDir(dir);
    return files;
  }

  // Read file content safely
  readFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      this.warning(`Could not read file ${filePath}: ${err.message}`);
      return '';
    }
  }

  // Check if file has 'use client' directive
  hasUseClientDirective(content) {
    const lines = content.split('\n');
    // Check first few lines for 'use client' directive
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line === "'use client'" || line === '"use client"') {
        return true;
      }
      // Stop checking after first non-comment, non-empty line
      if (line && !line.startsWith('//') && !line.startsWith('/*')) {
        break;
      }
    }
    return false;
  }

  // Check if file has 'use server' directive
  hasUseServerDirective(content) {
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line === "'use server'" || line === '"use server"') {
        return true;
      }
    }
    return false;
  }

  // Detect client-side only patterns
  detectClientOnlyPatterns(content, filePath) {
    const clientPatterns = [
      { pattern: /useState/, name: 'useState hook' },
      { pattern: /useEffect/, name: 'useEffect hook' },
      { pattern: /useContext/, name: 'useContext hook' },
      { pattern: /useReducer/, name: 'useReducer hook' },
      { pattern: /useCallback/, name: 'useCallback hook' },
      { pattern: /useMemo/, name: 'useMemo hook' },
      { pattern: /useRef/, name: 'useRef hook' },
      { pattern: /useLayoutEffect/, name: 'useLayoutEffect hook' },
      { pattern: /window\./, name: 'window object' },
      { pattern: /document\./, name: 'document object' },
      { pattern: /localStorage/, name: 'localStorage' },
      { pattern: /sessionStorage/, name: 'sessionStorage' },
      { pattern: /navigator\./, name: 'navigator object' },
      { pattern: /addEventListener/, name: 'addEventListener' },
      { pattern: /removeEventListener/, name: 'removeEventListener' },
      { pattern: /onClick/, name: 'onClick handler' },
      { pattern: /onChange/, name: 'onChange handler' },
      { pattern: /onSubmit/, name: 'onSubmit handler' },
      { pattern: /createContext/, name: 'createContext' }
    ];

    const issues = [];
    clientPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        issues.push(name);
      }
    });

    return issues;
  }

  // Detect server-side only patterns
  detectServerOnlyPatterns(content, filePath) {
    const serverPatterns = [
      { pattern: /require\s*\(\s*['"]fs['"]/, name: 'fs module' },
      { pattern: /require\s*\(\s*['"]path['"]/, name: 'path module' },
      { pattern: /require\s*\(\s*['"]crypto['"]/, name: 'crypto module' },
      { pattern: /process\.env/, name: 'process.env (server-side)' },
      { pattern: /headers\(\)/, name: 'Next.js headers() function' },
      { pattern: /cookies\(\)/, name: 'Next.js cookies() function' },
      { pattern: /redirect\(/, name: 'Next.js redirect() function' },
      { pattern: /notFound\(/, name: 'Next.js notFound() function' },
      { pattern: /generateMetadata/, name: 'generateMetadata function' }
    ];

    const issues = [];
    serverPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        issues.push(name);
      }
    });

    return issues;
  }

  // Check if file is in app directory (App Router)
  isAppRouterFile(filePath) {
    return filePath.includes('/app/') || filePath.includes('\\app\\');
  }

  // Check if file is a page or layout component
  isSpecialNextFile(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return ['page', 'layout', 'loading', 'error', 'not-found', 'global-error'].includes(fileName);
  }

  // Validate individual component file
  validateComponentFile(filePath) {
    const content = this.readFileContent(filePath);
    if (!content) return;

    const relativePath = path.relative(process.cwd(), filePath);
    const hasUseClient = this.hasUseClientDirective(content);
    const hasUseServer = this.hasUseServerDirective(content);
    const isAppRouter = this.isAppRouterFile(filePath);
    const isSpecialFile = this.isSpecialNextFile(filePath);

    this.scannedFiles++;

    // Check for conflicting directives
    if (hasUseClient && hasUseServer) {
      this.error(`Cannot have both 'use client' and 'use server' directives`, relativePath);
      return;
    }

    // Detect patterns
    const clientOnlyPatterns = this.detectClientOnlyPatterns(content, filePath);
    const serverOnlyPatterns = this.detectServerOnlyPatterns(content, filePath);

    // App Router specific validations
    if (isAppRouter) {
      // Server Components (default in App Router)
      if (!hasUseClient && clientOnlyPatterns.length > 0) {
        this.error(
          `Server Component using client-only patterns: ${clientOnlyPatterns.join(', ')}. Add 'use client' directive.`,
          relativePath
        );
      }

      // Client Components
      if (hasUseClient && serverOnlyPatterns.length > 0) {
        this.error(
          `Client Component using server-only patterns: ${serverOnlyPatterns.join(', ')}. Move to Server Component or use alternative.`,
          relativePath
        );
      }

      // Special files validation
      if (isSpecialFile) {
        if (hasUseClient && ['layout', 'page'].includes(path.basename(filePath, path.extname(filePath)))) {
          this.warning(
            `Special file (${path.basename(filePath)}) using 'use client'. Consider moving client logic to separate components.`,
            relativePath
          );
        }
      }
    }

    // Check for common mistakes
    this.checkCommonMistakes(content, filePath, relativePath, hasUseClient);
  }

  // Check for common component boundary mistakes
  checkCommonMistakes(content, filePath, relativePath, hasUseClient) {
    // Check for server actions in client components
    if (hasUseClient && /action\s*=/.test(content)) {
      this.warning(`Client Component may be using server actions incorrectly`, relativePath);
    }

    // Check for improper data fetching
    if (hasUseClient && /await fetch\(/.test(content)) {
      this.warning(`Client Component using await fetch. Consider using SWR or React Query for client-side data fetching`, relativePath);
    }

    // Check for environment variables in client components
    if (hasUseClient && /process\.env\.(?!NEXT_PUBLIC_)/.test(content)) {
      this.error(`Client Component accessing server-only environment variables`, relativePath);
    }

    // Check for missing 'use client' with event handlers
    if (!hasUseClient && this.isAppRouterFile(filePath) && 
        /(onClick|onChange|onSubmit|onFocus|onBlur)/.test(content)) {
      this.error(`Server Component using event handlers. Add 'use client' directive.`, relativePath);
    }

    // Check for hydration mismatches
    if (hasUseClient && /new Date\(\)/.test(content)) {
      this.warning(`Client Component using new Date() may cause hydration mismatches`, relativePath);
    }

    // Check for improper async component syntax
    if (!hasUseClient && /export\s+default\s+async\s+function/.test(content) && 
        !this.isSpecialNextFile(filePath)) {
      this.info(`Async Server Component detected (this is correct for data fetching)`, relativePath);
    }
  }

  // Run TypeScript check
  runTypeScriptCheck() {
    try {
      this.info('Running TypeScript type checking...');
      execSync('npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.success('TypeScript type checking passed');
      return true;
    } catch (error) {
      const output = error.stdout ? error.stdout.toString() : '';
      const errorOutput = error.stderr ? error.stderr.toString() : '';
      
      // Parse TypeScript errors for component boundary issues
      const boundaryErrors = this.parseTypeScriptErrors(output + errorOutput);
      if (boundaryErrors.length > 0) {
        boundaryErrors.forEach(err => this.error(err));
      } else {
        this.error('TypeScript type checking failed');
      }
      return false;
    }
  }

  // Parse TypeScript errors for boundary-related issues
  parseTypeScriptErrors(output) {
    const boundaryErrors = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('use client') || 
          line.includes('use server') ||
          line.includes('Server Component') ||
          line.includes('Client Component')) {
        boundaryErrors.push(line.trim());
      }
    });
    
    return boundaryErrors;
  }

  // Run Next.js build check (dry run)
  runNextBuildCheck() {
    try {
      this.info('Running Next.js build check...');
      // Use --dry-run if available, otherwise just type-check
      execSync('npx next build --dry-run || npx next build --check', { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 60000 // 1 minute timeout
      });
      this.success('Next.js build check passed');
      return true;
    } catch (error) {
      const output = error.stdout ? error.stdout.toString() : '';
      const errorOutput = error.stderr ? error.stderr.toString() : '';
      
      this.error('Next.js build check failed');
      
      // Look for specific boundary errors
      if (output.includes('use client') || output.includes('use server')) {
        this.error('Build failed due to component boundary issues');
      }
      
      return false;
    }
  }

  // Main validation method
  async validate() {
    this.log('\n🔍 Starting Component Boundary Validation\n', 'bold');
    
    const startTime = Date.now();
    
    // Get all component files
    const componentsDir = path.join(process.cwd(), 'components');
    const appDir = path.join(process.cwd(), 'app');
    const libDir = path.join(process.cwd(), 'lib');
    
    let allFiles = [];
    
    if (fs.existsSync(componentsDir)) {
      allFiles.push(...this.getComponentFiles(componentsDir));
    }
    
    if (fs.existsSync(appDir)) {
      allFiles.push(...this.getComponentFiles(appDir));
    }
    
    if (fs.existsSync(libDir)) {
      allFiles.push(...this.getComponentFiles(libDir));
    }

    this.info(`Found ${allFiles.length} component files to validate`);

    // Validate each component file
    this.log('\n📋 Validating Component Files:', 'bold');
    allFiles.forEach(filePath => {
      this.validateComponentFile(filePath);
    });

    // Run additional checks
    this.log('\n🔄 Running Additional Checks:', 'bold');
    
    // TypeScript check
    const tsCheckPassed = this.runTypeScriptCheck();
    
    // Next.js build check (if not in CI to avoid long build times)
    let buildCheckPassed = true;
    if (!this.isCI || process.env.RUN_BUILD_CHECK === 'true') {
      buildCheckPassed = this.runNextBuildCheck();
    } else {
      this.info('Skipping Next.js build check in CI (set RUN_BUILD_CHECK=true to enable)');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    this.printSummary(duration, tsCheckPassed && buildCheckPassed);

    return this.exitCode;
  }

  printSummary(duration, additionalChecksPassed) {
    this.log('\n📊 Component Boundary Validation Summary:', 'bold');
    this.log('='.repeat(60), 'blue');
    
    this.log(`📁 Files Scanned: ${this.scannedFiles}`, 'cyan');
    this.log(`⏱️  Duration: ${duration}s`, 'cyan');
    this.log(`✅ Successes: ${this.successes.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.exitCode = 1;
      this.log('\n🚨 Deployment blocked due to component boundary errors!', 'red');
      this.log('Fix the following issues before deploying:\n', 'red');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'red');
      });
    } else if (!additionalChecksPassed) {
      this.exitCode = 1;
      this.log('\n🚨 Deployment blocked due to TypeScript or build errors!', 'red');
    } else {
      this.log('\n🎉 Component boundary validation passed!', 'green');
      if (this.warnings.length > 0) {
        this.log('Consider addressing warnings for better performance:', 'yellow');
        this.warnings.forEach((warning, index) => {
          this.log(`${index + 1}. ${warning}`, 'yellow');
        });
      }
    }

    this.log('='.repeat(60), 'blue');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ComponentBoundaryValidator();
  validator.validate().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

module.exports = ComponentBoundaryValidator;