#!/usr/bin/env node

/**
 * Pre-Deployment API Health Check Validator
 * Validates all API endpoints and external dependencies before deployment
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

class APIHealthValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.isCI = process.env.CI === 'true';
    this.exitCode = 0;
    this.apiRoutes = [];
    this.externalDependencies = [];
    this.timeout = 10000; // 10 seconds
  }

  log(message, color = 'reset') {
    if (!this.isCI) {
      console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
      console.log(message);
    }
  }

  error(message, context = '') {
    const errorMsg = context ? `${context}: ${message}` : message;
    this.errors.push(errorMsg);
    this.log(`❌ ERROR: ${errorMsg}`, 'red');
  }

  warning(message, context = '') {
    const warningMsg = context ? `${context}: ${message}` : message;
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

  // Discover API routes from the file system
  discoverAPIRoutes() {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    if (!fs.existsSync(apiDir)) {
      this.warning('No app/api directory found');
      return [];
    }

    const routes = [];
    
    const scanDirectory = (dir, basePath = '') => {
      try {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Dynamic route folder like [id]
            const routePath = item.startsWith('[') && item.endsWith(']') 
              ? `${basePath}/${item}` 
              : `${basePath}/${item}`;
            scanDirectory(fullPath, routePath);
          } else if (item === 'route.ts' || item === 'route.js') {
            routes.push({
              path: basePath || '/',
              filePath: fullPath,
              methods: this.extractHTTPMethods(fullPath)
            });
          }
        });
      } catch (err) {
        this.warning(`Could not scan API directory ${dir}: ${err.message}`);
      }
    };

    scanDirectory(apiDir);
    return routes;
  }

  // Extract HTTP methods from route file
  extractHTTPMethods(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const methods = [];
      
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].forEach(method => {
        if (new RegExp(`export\\s+async\\s+function\\s+${method}`, 'i').test(content)) {
          methods.push(method);
        }
      });
      
      return methods;
    } catch (err) {
      this.warning(`Could not read route file ${filePath}: ${err.message}`);
      return [];
    }
  }

  // Extract external dependencies from API routes
  extractExternalDependencies() {
    const dependencies = new Set();
    
    this.apiRoutes.forEach(route => {
      try {
        const content = fs.readFileSync(route.filePath, 'utf8');
        
        // Look for fetch calls
        const fetchMatches = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (fetchMatches) {
          fetchMatches.forEach(match => {
            const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
            if (urlMatch) {
              const url = urlMatch[1];
              if (url.startsWith('http://') || url.startsWith('https://')) {
                dependencies.add(url);
              }
            }
          });
        }

        // Look for environment variable URLs
        const envUrlMatches = content.match(/process\.env\.[\w_]+/g);
        if (envUrlMatches) {
          envUrlMatches.forEach(envVar => {
            const varName = envVar.replace('process.env.', '');
            const value = process.env[varName];
            if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
              dependencies.add(value);
            }
          });
        }

      } catch (err) {
        this.warning(`Could not analyze route file ${route.filePath}: ${err.message}`);
      }
    });

    return Array.from(dependencies);
  }

  // Make HTTP request with timeout
  async makeRequest(url, method = 'GET', timeout = this.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Use dynamic import for fetch in Node.js environments that might not have it
      const fetch = globalThis.fetch || (await import('node-fetch')).default;
      
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'User-Agent': 'AI-Readiness-Deployment-Validator/1.0'
        }
      });

      clearTimeout(timeoutId);
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // Validate individual API route
  async validateAPIRoute(route) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}/api${route.path}`;

    for (const method of route.methods) {
      try {
        const response = await this.makeRequest(fullUrl, method);
        
        if (response.ok || response.status < 500) {
          this.success(`${method} ${route.path} - Status: ${response.status}`);
        } else {
          this.error(`${method} ${route.path} - Server Error: ${response.status} ${response.statusText}`, 'API Route');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          this.error(`${method} ${route.path} - Request timeout (>${this.timeout}ms)`, 'API Route');
        } else if (err.code === 'ECONNREFUSED') {
          this.warning(`${method} ${route.path} - Server not running (expected during build)`, 'API Route');
        } else {
          this.error(`${method} ${route.path} - ${err.message}`, 'API Route');
        }
      }
    }
  }

  // Validate external dependency
  async validateExternalDependency(url) {
    try {
      const response = await this.makeRequest(url, 'GET');
      
      if (response.ok) {
        this.success(`External dependency reachable: ${url}`);
      } else {
        this.error(`External dependency error: ${url} - Status: ${response.status}`, 'External API');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        this.error(`External dependency timeout: ${url} (>${this.timeout}ms)`, 'External API');
      } else {
        this.error(`External dependency unreachable: ${url} - ${err.message}`, 'External API');
      }
    }
  }

  // Validate Supabase connection
  async validateSupabaseConnection() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.warning('Supabase credentials not configured');
      return;
    }

    try {
      // Test Supabase REST API health endpoint
      const healthUrl = `${supabaseUrl}/rest/v1/`;
      const response = await this.makeRequest(healthUrl, 'GET');

      if (response.ok) {
        this.success('Supabase connection healthy');
      } else {
        this.error(`Supabase connection error - Status: ${response.status}`, 'Supabase');
      }
    } catch (err) {
      this.error(`Supabase connection failed: ${err.message}`, 'Supabase');
    }
  }

  // Check for common API security issues
  validateAPISecurityPractices() {
    this.apiRoutes.forEach(route => {
      try {
        const content = fs.readFileSync(route.filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), route.filePath);

        // Check for CORS configuration
        if (!content.includes('cors') && route.methods.length > 1) {
          this.warning(`No CORS configuration detected`, relativePath);
        }

        // Check for rate limiting
        if (!content.includes('rateLimit') && !content.includes('rate-limit')) {
          this.warning(`No rate limiting detected`, relativePath);
        }

        // Check for authentication
        if (!content.includes('auth') && !content.includes('Authorization')) {
          this.info(`No authentication detected (may be public endpoint)`, relativePath);
        }

        // Check for input validation
        if (!content.includes('validate') && !content.includes('zod') && !content.includes('joi')) {
          this.warning(`No input validation detected`, relativePath);
        }

        // Check for error handling
        if (!content.includes('try') || !content.includes('catch')) {
          this.warning(`No error handling detected`, relativePath);
        }

        // Check for SQL injection prevention
        if (content.includes('SELECT') || content.includes('INSERT')) {
          if (!content.includes('parameterized') && !content.includes('prepared')) {
            this.warning(`Potential SQL injection risk`, relativePath);
          }
        }

      } catch (err) {
        this.warning(`Could not analyze security practices for ${route.filePath}: ${err.message}`);
      }
    });
  }

  // Validate API response schemas
  validateAPISchemas() {
    this.apiRoutes.forEach(route => {
      try {
        const content = fs.readFileSync(route.filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), route.filePath);

        // Check for response type definitions
        if (!content.includes('Response') && !content.includes('return')) {
          this.warning(`No response schema defined`, relativePath);
        }

        // Check for OpenAPI/Swagger documentation
        if (!content.includes('swagger') && !content.includes('openapi')) {
          this.info(`No API documentation detected`, relativePath);
        }

      } catch (err) {
        this.warning(`Could not analyze schemas for ${route.filePath}: ${err.message}`);
      }
    });
  }

  // Check environment-specific configurations
  validateEnvironmentConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';

    // Production-specific validations
    if (isProduction) {
      // Check for debug endpoints
      const debugRoutes = this.apiRoutes.filter(route => 
        route.path.includes('debug') || 
        route.path.includes('test') ||
        route.path.includes('dev')
      );

      if (debugRoutes.length > 0) {
        debugRoutes.forEach(route => {
          this.error(`Debug endpoint exposed in production: ${route.path}`, 'Security');
        });
      }

      // Check for proper error handling (no stack traces)
      this.apiRoutes.forEach(route => {
        try {
          const content = fs.readFileSync(route.filePath, 'utf8');
          if (content.includes('.stack') || content.includes('error.stack')) {
            this.warning(`Stack trace exposure in production`, path.relative(process.cwd(), route.filePath));
          }
        } catch (err) {
          // Continue
        }
      });
    }

    // Vercel-specific validations
    if (isVercel) {
      this.info('Vercel deployment detected - validating serverless compatibility');
      
      // Check for file system operations
      this.apiRoutes.forEach(route => {
        try {
          const content = fs.readFileSync(route.filePath, 'utf8');
          const relativePath = path.relative(process.cwd(), route.filePath);

          if (content.includes('fs.writeFile') || content.includes('fs.mkdir')) {
            this.error(`File system write operations not supported in Vercel serverless`, relativePath);
          }
        } catch (err) {
          // Continue
        }
      });
    }
  }

  // Main validation method
  async validate() {
    this.log('\n🔍 Starting API Health Validation\n', 'bold');
    
    const startTime = Date.now();

    // Discover API routes
    this.log('📡 Discovering API Routes:', 'bold');
    this.apiRoutes = this.discoverAPIRoutes();
    this.info(`Found ${this.apiRoutes.length} API routes`);

    if (this.apiRoutes.length === 0) {
      this.warning('No API routes found - skipping API validation');
      return 0;
    }

    // Extract external dependencies
    this.log('\n🌐 Discovering External Dependencies:', 'bold');
    this.externalDependencies = this.extractExternalDependencies();
    this.info(`Found ${this.externalDependencies.length} external dependencies`);

    // Security practices validation
    this.log('\n🔒 Validating Security Practices:', 'bold');
    this.validateAPISecurityPractices();

    // Schema validation
    this.log('\n📋 Validating API Schemas:', 'bold');
    this.validateAPISchemas();

    // Environment-specific validations
    this.log('\n⚙️  Validating Environment Configuration:', 'bold');
    this.validateEnvironmentConfig();

    // Test external dependencies
    if (this.externalDependencies.length > 0) {
      this.log('\n🌐 Testing External Dependencies:', 'bold');
      for (const url of this.externalDependencies) {
        await this.validateExternalDependency(url);
      }
    }

    // Test Supabase connection
    this.log('\n🗄️  Testing Database Connection:', 'bold');
    await this.validateSupabaseConnection();

    // Test API routes (only if server might be running)
    if (!this.isCI || process.env.TEST_API_ROUTES === 'true') {
      this.log('\n📡 Testing API Routes:', 'bold');
      for (const route of this.apiRoutes) {
        await this.validateAPIRoute(route);
      }
    } else {
      this.info('Skipping API route testing in CI (set TEST_API_ROUTES=true to enable)');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    this.printSummary(duration);

    return this.exitCode;
  }

  printSummary(duration) {
    this.log('\n📊 API Health Validation Summary:', 'bold');
    this.log('='.repeat(60), 'blue');
    
    this.log(`📡 API Routes: ${this.apiRoutes.length}`, 'cyan');
    this.log(`🌐 External Dependencies: ${this.externalDependencies.length}`, 'cyan');
    this.log(`⏱️  Duration: ${duration}s`, 'cyan');
    this.log(`✅ Successes: ${this.successes.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.exitCode = 1;
      this.log('\n🚨 Deployment blocked due to API health errors!', 'red');
      this.log('Fix the following issues before deploying:\n', 'red');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'red');
      });
    } else {
      this.log('\n🎉 API health validation passed!', 'green');
      if (this.warnings.length > 0) {
        this.log('Consider addressing warnings for better security and reliability:', 'yellow');
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
  const validator = new APIHealthValidator();
  validator.validate().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

module.exports = APIHealthValidator;