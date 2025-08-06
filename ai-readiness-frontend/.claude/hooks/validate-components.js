#!/usr/bin/env node

/**
 * Pre-commit hook to validate React Server/Client component boundaries
 * Prevents common errors like:
 * - useState/useEffect in server components
 * - Passing functions as props from server to client components
 * - Missing 'use client' directives
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class ComponentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Check if a file is a client component
   */
  isClientComponent(content) {
    return content.startsWith("'use client'") || content.startsWith('"use client"');
  }

  /**
   * Check if a file is a server component (no 'use client' directive)
   */
  isServerComponent(content) {
    return !this.isClientComponent(content);
  }

  /**
   * Detect React hooks usage in the file
   */
  detectHooks(content) {
    const hookPatterns = [
      /\buseState\b/,
      /\buseEffect\b/,
      /\buseLayoutEffect\b/,
      /\buseReducer\b/,
      /\buseCallback\b/,
      /\buseMemo\b/,
      /\buseRef\b/,
      /\buseContext\b/,
      /\buseImperativeHandle\b/,
      /\buseDebugValue\b/,
      /\buseTransition\b/,
      /\buseDeferredValue\b/,
      /\buseId\b/,
      /\buseOptimistic\b/,
      /\React\.useState\b/,
      /\React\.useEffect\b/,
      /\React\.useCallback\b/,
      /\React\.useMemo\b/,
      /\React\.useRef\b/
    ];

    const foundHooks = [];
    for (const pattern of hookPatterns) {
      if (pattern.test(content)) {
        const hookName = pattern.source.replace(/\\b|\\|React\\\./g, '');
        foundHooks.push(hookName);
      }
    }
    return foundHooks;
  }

  /**
   * Detect if a component passes function props
   */
  detectFunctionProps(content) {
    const functionPropPatterns = [
      // Direct function props: icon={SomeComponent}
      /\s+\w+={[A-Z][a-zA-Z0-9_]*}\s*/g,
      // Arrow function props: onClick={() => {}}
      /\s+on[A-Z]\w*={\([^)]*\)\s*=>/g,
      // Function props: onClick={handleClick}
      /\s+on[A-Z]\w*={[a-z][a-zA-Z0-9_]*}/g
    ];

    const matches = [];
    for (const pattern of functionPropPatterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }
    return matches;
  }

  /**
   * Detect component imports from UI libraries
   */
  detectComponentImports(content) {
    const importPattern = /import\s+.*?from\s+['"](@\/components\/ui|lucide-react|@radix-ui)['"]/g;
    return content.match(importPattern) || [];
  }

  /**
   * Validate a single file
   */
  validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const isClient = this.isClientComponent(content);
    const hooks = this.detectHooks(content);
    const functionProps = this.detectFunctionProps(content);
    const componentImports = this.detectComponentImports(content);

    // Check 1: Hooks in server components
    if (!isClient && hooks.length > 0) {
      this.errors.push({
        file: filePath,
        type: 'HOOKS_IN_SERVER_COMPONENT',
        message: `Server component uses React hooks: ${hooks.join(', ')}`,
        fix: "Add 'use client' directive at the top of the file"
      });
    }

    // Check 2: Server components passing function props to potential client components
    if (!isClient && functionProps.length > 0 && componentImports.length > 0) {
      // Check if any of the function props look like component props (capitalized)
      const componentProps = functionProps.filter(prop => /={[A-Z]/.test(prop));
      if (componentProps.length > 0) {
        this.warnings.push({
          file: filePath,
          type: 'FUNCTION_PROPS_IN_SERVER',
          message: `Server component may be passing function/component props: ${componentProps.join(', ')}`,
          fix: "Consider making this a client component or restructuring the props"
        });
      }
    }

    // Check 3: Client components in app directory pages (performance warning)
    if (isClient && filePath.includes('/app/') && fileName === 'page.tsx') {
      this.warnings.push({
        file: filePath,
        type: 'CLIENT_PAGE_COMPONENT',
        message: 'Page component is a client component, consider server-side rendering for better performance',
        fix: 'Move client logic to child components and keep page.tsx as server component when possible'
      });
    }

    // Check 4: Missing 'use client' for interactive components
    if (!isClient && content.includes('onClick') || content.includes('onChange') || content.includes('onSubmit')) {
      if (!content.includes('use server')) {
        this.warnings.push({
          file: filePath,
          type: 'INTERACTIVE_SERVER_COMPONENT',
          message: 'Component has event handlers but no "use client" directive',
          fix: "Add 'use client' directive for interactive components"
        });
      }
    }
  }

  /**
   * Get all TypeScript/JavaScript files to validate
   */
  getFilesToValidate() {
    // Check if we should validate all files (environment variable or argument)
    const validateAllFiles = process.env.VALIDATE_ALL_FILES === 'true' || 
                            process.argv.includes('--all') || 
                            process.argv.includes('--validate-all');

    if (validateAllFiles) {
      return this.getAllComponentFiles();
    }

    try {
      // Get staged files from git
      const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
        .split('\n')
        .filter(file => file.match(/\.(tsx?|jsx?)$/))
        .filter(file => !file.includes('node_modules'))
        .filter(file => !file.includes('.next'))
        .filter(file => fs.existsSync(file));

      return staged;
    } catch (error) {
      // If not in a git repo or no staged files, validate all components
      return this.getAllComponentFiles();
    }
  }

  /**
   * Get all component files in the project
   */
  getAllComponentFiles() {
    const componentDirs = ['app', 'components', 'lib'];
    const files = [];

    for (const dir of componentDirs) {
      if (fs.existsSync(dir)) {
        this.walkDir(dir, files);
      }
    }

    return files.filter(file => file.match(/\.(tsx?|jsx?)$/));
  }

  /**
   * Recursively walk directory to find files
   */
  walkDir(dir, files) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.walkDir(fullPath, files);
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  }

  /**
   * Run validation on all files
   */
  run() {
    const isAllFiles = process.env.VALIDATE_ALL_FILES === 'true' || 
                      process.argv.includes('--all') || 
                      process.argv.includes('--validate-all');
    
    const mode = isAllFiles ? 'all files' : 'staged files';
    console.log(`${colors.blue}🔍 Validating React component boundaries (${mode})...${colors.reset}\n`);
    
    const files = this.getFilesToValidate();
    
    if (files.length === 0) {
      console.log(`${colors.yellow}No files to validate${colors.reset}`);
      return true;
    }

    console.log(`Checking ${files.length} file(s)...\n`);

    for (const file of files) {
      this.validateFile(file);
    }

    // Report results
    if (this.errors.length > 0) {
      console.log(`${colors.red}❌ Component Validation Errors:${colors.reset}\n`);
      for (const error of this.errors) {
        console.log(`  ${colors.red}ERROR${colors.reset} in ${error.file}`);
        console.log(`    ${error.message}`);
        console.log(`    ${colors.green}Fix: ${error.fix}${colors.reset}\n`);
      }
    }

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}⚠️  Component Validation Warnings:${colors.reset}\n`);
      for (const warning of this.warnings) {
        console.log(`  ${colors.yellow}WARNING${colors.reset} in ${warning.file}`);
        console.log(`    ${warning.message}`);
        console.log(`    ${colors.blue}Suggestion: ${warning.fix}${colors.reset}\n`);
      }
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`${colors.green}✅ All component boundaries validated successfully!${colors.reset}`);
    }

    // Summary
    console.log(`\n${colors.blue}Validation Summary:${colors.reset}`);
    console.log(`  Files checked: ${files.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    // Return false if there are errors (to fail the commit)
    return this.errors.length === 0;
  }
}

// Run the validator
if (require.main === module) {
  const validator = new ComponentValidator();
  const success = validator.run();
  
  if (!success) {
    console.log(`\n${colors.red}Commit blocked due to component validation errors.${colors.reset}`);
    console.log(`${colors.yellow}Please fix the errors above and try again.${colors.reset}\n`);
    process.exit(1);
  }
}

module.exports = ComponentValidator;