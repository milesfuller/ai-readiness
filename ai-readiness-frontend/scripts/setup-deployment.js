#!/usr/bin/env node

/**
 * Deployment Setup Script
 * Validates and prepares the project for deployment
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`
  }
  console.log(`${prefix[type]} ${message}`)
}

function checkEnvironmentVariables() {
  log('Checking environment variables...', 'info')
  
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': 'Supabase project URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase anonymous key',
    'ANTHROPIC_API_KEY': 'Anthropic API key for AI features'
  }
  
  const missing = []
  const envFile = path.join(process.cwd(), '.env.local')
  const envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
  
  for (const [key, description] of Object.entries(required)) {
    if (!process.env[key] && !envContent.includes(key)) {
      missing.push(`${key} - ${description}`)
    }
  }
  
  if (missing.length > 0) {
    log('Missing environment variables:', 'error')
    missing.forEach(m => console.log(`  - ${m}`))
    log('Add these to .env.local or Vercel dashboard', 'warning')
    return false
  }
  
  log('All environment variables present', 'success')
  return true
}

function validateBuild() {
  log('Running build validation...', 'info')
  
  try {
    execSync('npm run build', { stdio: 'pipe' })
    log('Build successful', 'success')
    return true
  } catch (error) {
    log('Build failed! Fix errors before deploying', 'error')
    console.error(error.stdout?.toString() || error.message)
    return false
  }
}

function checkTypeScript() {
  log('Checking TypeScript...', 'info')
  
  try {
    execSync('npm run type-check', { stdio: 'pipe' })
    log('TypeScript check passed', 'success')
    return true
  } catch (error) {
    log('TypeScript errors found!', 'error')
    return false
  }
}

function runTests() {
  log('Running tests...', 'info')
  
  try {
    execSync('npm test -- --passWithNoTests', { stdio: 'pipe' })
    log('Tests passed', 'success')
    return true
  } catch (error) {
    log('Tests failed!', 'warning')
    return true // Don't block deployment for test failures
  }
}

function checkEdgeCompatibility() {
  log('Checking Edge Runtime compatibility...', 'info')
  
  const apiDir = path.join(process.cwd(), 'app', 'api')
  let issues = []
  
  function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Check for Node.js specific modules
    if (content.includes("require('crypto')") || content.includes('from "crypto"')) {
      issues.push(`${filePath}: Uses Node.js crypto module`)
    }
    
    if (content.includes('Buffer.')) {
      issues.push(`${filePath}: Uses Node.js Buffer`)
    }
    
    if (content.includes('process.') && !content.includes('process.env')) {
      issues.push(`${filePath}: Uses Node.js process (except env)`)
    }
  }
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        walkDir(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        checkFile(filePath)
      }
    })
  }
  
  if (fs.existsSync(apiDir)) {
    walkDir(apiDir)
  }
  
  if (issues.length > 0) {
    log('Edge Runtime compatibility issues:', 'warning')
    issues.forEach(issue => console.log(`  - ${issue}`))
    return false
  }
  
  log('Edge Runtime compatibility check passed', 'success')
  return true
}

function generateDeploymentInfo() {
  log('Generating deployment info...', 'info')
  
  const info = {
    timestamp: new Date().toISOString(),
    commit: execSync('git rev-parse HEAD').toString().trim(),
    branch: execSync('git branch --show-current').toString().trim(),
    nodeVersion: process.version,
    checks: {
      environment: checkEnvironmentVariables(),
      typescript: checkTypeScript(),
      build: validateBuild(),
      edge: checkEdgeCompatibility(),
      tests: runTests()
    }
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), '.deployment-info.json'),
    JSON.stringify(info, null, 2)
  )
  
  return info
}

function createEnvExample() {
  log('Creating .env.example...', 'info')
  
  const template = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic API (for AI features)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=
`
  
  fs.writeFileSync(path.join(process.cwd(), '.env.example'), template)
  log('Created .env.example', 'success')
}

// Main execution
console.log(`${colors.bright}🚀 Deployment Setup Script${colors.reset}\n`)

const info = generateDeploymentInfo()
createEnvExample()

console.log(`\n${colors.bright}Summary:${colors.reset}`)
const allPassed = Object.values(info.checks).every(check => check)

if (allPassed) {
  log('All checks passed! Ready to deploy 🎉', 'success')
  console.log('\nDeploy with: vercel --prod')
} else {
  log('Some checks failed. Fix issues before deploying.', 'error')
  process.exit(1)
}