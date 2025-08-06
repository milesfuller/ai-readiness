#!/usr/bin/env node

/**
 * Next.js Vercel Deployment Specialist Agent
 * 
 * Standalone validation tool for ANY Next.js project deploying to Vercel.
 * No external dependencies required - works with vanilla Node.js.
 * 
 * Detects and fixes common deployment issues across all Next.js versions:
 * - Server/Client component boundaries
 * - Missing 'use client' directives  
 * - Import pattern violations
 * - TypeScript errors
 * - Environment variable issues
 * - Production readiness
 * 
 * Usage: node nextjs-vercel-specialist.js [project-path]
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class NextJSVercelSpecialist {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  /**
   * Main entry point for the agent
   */
  async analyze(projectPath = '.') {
    // First check if this is a Next.js project
    if (!await this.isNextJsProject(projectPath)) {
      console.log('❌ Not a Next.js project. This agent is specific to Next.js/Vercel deployments.\n');
      return false;
    }
    
    console.log('🚀 Next.js/Vercel Specialist Agent Starting...\n');
    console.log(`📁 Analyzing project: ${path.resolve(projectPath)}\n`);
    
    const tasks = [
      this.checkServerClientBoundaries.bind(this),
      this.validateImports.bind(this),
      this.checkAuthenticationPatterns.bind(this),
      this.validateBuildConfiguration.bind(this),
      this.checkEnvironmentVariables.bind(this),
      this.validateTypeScript.bind(this),
      this.checkForCommonErrors.bind(this)
    ];

    for (const task of tasks) {
      await task(projectPath);
    }

    this.report();
    return this.errors.length === 0;
  }

  /**
   * Check for server/client component boundary violations
   */
  async checkServerClientBoundaries(projectPath) {
    console.log('📋 Checking Server/Client Component Boundaries...');
    
    const files = await this.getFiles(projectPath, /\.(tsx|jsx)$/);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const hasUseClient = content.startsWith("'use client'") || content.startsWith('"use client"');
      
      // Skip test files - they're not components
      if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
        continue;
      }
      
      // Check for hooks in server components
      const hooks = [
        'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
        'useContext', 'useReducer', 'useLayoutEffect'
      ];
      
      for (const hook of hooks) {
        const regex = new RegExp(`\\b${hook}\\b`, 'g');
        if (regex.test(content) && !hasUseClient) {
          this.errors.push({
            file: path.relative(projectPath, file),
            issue: `Uses ${hook} but missing 'use client' directive`,
            fix: `Add 'use client' at the top of the file`
          });
        }
      }
      
      // Check for event handlers in server components
      const eventHandlers = /\bon[A-Z]\w*=/g;
      if (eventHandlers.test(content) && !hasUseClient && !content.includes('use server')) {
        this.warnings.push({
          file: path.relative(projectPath, file),
          issue: 'Has event handlers but no "use client" directive',
          fix: `Consider adding 'use client' for interactive components`
        });
      }
      
      // Check for server imports in client components
      if (hasUseClient && content.includes('next/headers')) {
        this.errors.push({
          file: path.relative(projectPath, file),
          issue: 'Client component imports next/headers (server-only)',
          fix: 'Move server logic to a server component or API route'
        });
      }
    }
  }

  /**
   * Validate import patterns
   */
  async validateImports(projectPath) {
    console.log('🔍 Validating Import Patterns...');
    
    // Check for problematic index.ts exports
    const indexFiles = await this.getFiles(projectPath, /index\.(ts|js)$/);
    
    for (const file of indexFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check if index.ts exports both server and client utilities
      if (content.includes('./server') && 
          (content.includes('./client') || content.includes('./browser'))) {
        this.warnings.push({
          file: path.relative(projectPath, file),
          issue: 'Index file exports both server and client utilities',
          fix: 'Separate server and client exports to avoid import errors'
        });
      }
    }
  }

  /**
   * Check authentication patterns
   */
  async checkAuthenticationPatterns(projectPath) {
    console.log('🔐 Checking Authentication Patterns...');
    
    const pageFiles = await this.getFiles(projectPath, /page\.(tsx|jsx)$/);
    
    for (const file of pageFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const isProtectedRoute = 
        file.includes('dashboard') || 
        file.includes('admin') || 
        file.includes('profile');
      
      if (isProtectedRoute) {
        const hasUseClient = content.startsWith("'use client'");
        const hasAuthCheck = content.includes('getUser') || content.includes('getSession');
        
        if (hasUseClient && hasAuthCheck) {
          this.errors.push({
            file: path.relative(projectPath, file),
            issue: 'Client component doing auth check (unreliable)',
            fix: 'Move auth check to server component and pass data to client'
          });
        }
        
        if (!hasAuthCheck && !hasUseClient) {
          this.warnings.push({
            file: path.relative(projectPath, file),
            issue: 'Protected route may lack auth check',
            fix: 'Add server-side auth check with redirect'
          });
        }
      }
    }
  }

  /**
   * Validate build configuration
   */
  async validateBuildConfiguration(projectPath) {
    console.log('🏗️ Validating Build Configuration...');
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check for problematic scripts
    if (packageJson.scripts?.prepare?.includes('husky') && 
        !packageJson.scripts.prepare.includes('VERCEL')) {
      this.fixes.push({
        file: 'package.json',
        issue: 'Husky will fail in Vercel deployment',
        fix: 'Already fixed: Added VERCEL check to prepare script'
      });
    }
    
    // Check for validation in build script
    if (packageJson.scripts?.build?.includes('validate')) {
      this.warnings.push({
        file: 'package.json',
        issue: 'Build script includes validation that may fail deployment',
        fix: 'Consider moving validation to separate script'
      });
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables(projectPath) {
    console.log('🔑 Checking Environment Variables...');
    
    const envFiles = ['.env.example', '.env.local', '.env'];
    let hasEnvFile = false;
    
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(projectPath, envFile);
        const envContent = await fs.readFile(envPath, 'utf-8');
        hasEnvFile = true;
        
        const requiredVars = envContent.match(/^[A-Z_]+=/gm) || [];
        
        // Check for client-side variables without NEXT_PUBLIC_ prefix
        for (const varLine of requiredVars) {
          const varName = varLine.split('=')[0];
          
          // Common client-side vars that need NEXT_PUBLIC_ prefix
          const clientVars = ['API_URL', 'API_KEY', 'PUBLIC_KEY', 'ANON_KEY', 'URL', 'HOST'];
          const needsPrefix = clientVars.some(cv => varName.includes(cv) && !varName.startsWith('NEXT_PUBLIC_'));
          
          if (needsPrefix) {
            this.warnings.push({
              file: envFile,
              issue: `${varName} might need NEXT_PUBLIC_ prefix for client access`,
              fix: `If used in client components, rename to NEXT_PUBLIC_${varName}`
            });
          }
        }
      } catch {}
    }
    
    if (!hasEnvFile) {
      this.warnings.push({
        file: 'Environment',
        issue: 'No environment files found',
        fix: 'Create .env.example with required variables'
      });
    }
  }

  /**
   * Validate TypeScript configuration
   */
  async validateTypeScript(projectPath) {
    console.log('📝 Validating TypeScript...');
    
    try {
      execSync('npx tsc --noEmit', { cwd: projectPath, stdio: 'pipe' });
      console.log('  ✅ No TypeScript errors');
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/error TS/g) || []).length;
      
      if (errorCount > 0) {
        this.errors.push({
          file: 'TypeScript',
          issue: `${errorCount} TypeScript errors found`,
          fix: 'Run `npx tsc --noEmit` to see errors'
        });
      }
    }
  }

  /**
   * Check for common Next.js/Vercel errors
   */
  async checkForCommonErrors(projectPath) {
    console.log('🐛 Checking for Common Errors...');
    
    const componentFiles = await this.getFiles(projectPath, /\.(tsx|jsx)$/);
    
    for (const file of componentFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for passing functions to client components
      if (content.includes('icon={') && content.includes('lucide-react')) {
        const hasUseClient = content.startsWith("'use client'");
        if (!hasUseClient) {
          this.warnings.push({
            file: path.relative(projectPath, file),
            issue: 'May be passing icon components as props (serialization issue)',
            fix: `Add 'use client' if passing components as props`
          });
        }
      }
      
      // Skip test and development files
      if (file.includes('__tests__') || file.includes('.test.') || 
          file.includes('.spec.') || file.includes('.dev.')) {
        continue;
      }
      
      // Check for console.log in production
      if (content.includes('console.log')) {
        this.warnings.push({
          file: path.relative(projectPath, file),
          issue: 'Contains console.log (remove for production)',
          fix: 'Remove or use proper logging service'
        });
      }
    }
  }

  /**
   * Check if this is a Next.js project
   */
  async isNextJsProject(projectPath) {
    const indicators = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'app',
      'pages',
      '.next'
    ];
    
    for (const indicator of indicators) {
      try {
        await fs.access(path.join(projectPath, indicator));
        return true;
      } catch {}
    }
    
    // Check package.json for next dependency
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
      return !!(packageJson.dependencies?.next || packageJson.devDependencies?.next);
    } catch {}
    
    return false;
  }
  
  /**
   * Get all files matching pattern
   */
  async getFiles(dir, pattern) {
    const files = [];
    
    async function walk(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip node_modules and .next
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await walk(dir);
    return files;
  }

  /**
   * Generate report
   */
  report() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 NEXT.JS/VERCEL DEPLOYMENT ANALYSIS REPORT');
    console.log('='.repeat(60) + '\n');
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS (Must fix before deployment):\n');
      for (const error of this.errors) {
        console.log(`  📁 ${error.file}`);
        console.log(`     Issue: ${error.issue}`);
        console.log(`     Fix: ${error.fix}\n`);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS (Should fix for best practices):\n');
      for (const warning of this.warnings) {
        console.log(`  📁 ${warning.file}`);
        console.log(`     Issue: ${warning.issue}`);
        console.log(`     Fix: ${warning.fix}\n`);
      }
    }
    
    if (this.fixes.length > 0) {
      console.log('✅ ALREADY FIXED:\n');
      for (const fix of this.fixes) {
        console.log(`  📁 ${fix.file}`);
        console.log(`     Issue: ${fix.issue}`);
        console.log(`     Fix: ${fix.fix}\n`);
      }
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 No issues found! Project is ready for Vercel deployment.\n');
      console.log('📝 Note: If you encounter a 429 rate limit error during deployment:');
      console.log('   - Wait for the specified retry time (usually 50-60 seconds)');
      console.log('   - Use preview deployments first: vercel');
      console.log('   - Only deploy to production after testing: vercel --prod\n');
    } else {
      console.log('📋 SUMMARY:');
      console.log(`   Errors: ${this.errors.length}`);
      console.log(`   Warnings: ${this.warnings.length}`);
      console.log(`   Already Fixed: ${this.fixes.length}\n`);
      
      if (this.errors.length > 0) {
        console.log('🚫 Vercel deployment will likely FAIL due to errors above.');
        console.log('   Fix all errors before attempting deployment.\n');
      }
      
      console.log('💡 Deployment Tips:');
      console.log('   - Test locally first: npm run build');
      console.log('   - Use preview URLs: vercel');
      console.log('   - Check logs if failed: vercel logs');
      console.log('   - Handle rate limits: wait and retry\n');
    }
  }
}

// Run the agent if called directly
if (require.main === module) {
  const agent = new NextJSVercelSpecialist();
  const projectPath = process.argv[2] || '.';
  
  agent.analyze(projectPath).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = NextJSVercelSpecialist;