#!/usr/bin/env node

/**
 * Safe build script that handles missing environment variables and EPIPE errors
 * This script ensures the build succeeds even when optional API keys are missing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables for build
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Ensure fallback values for missing API keys
const buildEnv = {
  ...process.env,
  // Provide safe fallback values for missing API keys
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-build',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
  // Provide safe fallback values for Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-build.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-build-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-build-service-key',
  // Disable telemetry during build
  NEXT_TELEMETRY_DISABLED: '1',
  // Set build flag
  BUILD_MODE: 'true'
};

console.log('🚀 Starting safe build process...');

// Check if .env.local exists and warn if API keys are missing
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('✅ Found .env.local file');
  
  // Check for actual API keys
  const hasAnthropicKey = buildEnv.ANTHROPIC_API_KEY && buildEnv.ANTHROPIC_API_KEY !== 'dummy-key-for-build';
  const hasOpenAIKey = buildEnv.OPENAI_API_KEY && buildEnv.OPENAI_API_KEY !== 'dummy-key-for-build';
  
  if (!hasAnthropicKey && !hasOpenAIKey) {
    console.log('⚠️  Warning: No API keys found. LLM features will use fallback responses.');
    console.log('   To enable LLM features, add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local');
  }
} else {
  console.log('⚠️  No .env.local file found. Using build-safe fallback values.');
  console.log('   Create .env.local with your API keys for full functionality.');
}

// Handle EPIPE errors gracefully
process.on('EPIPE', () => {
  console.log('Handled EPIPE error during build');
});

// Spawn the Next.js build process
const buildProcess = spawn('npx', ['next', 'build'], {
  env: buildEnv,
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let buildOutput = '';
let buildErrors = '';

// Capture output
buildProcess.stdout.on('data', (data) => {
  const output = data.toString();
  buildOutput += output;
  process.stdout.write(output);
});

// Capture errors
buildProcess.stderr.on('data', (data) => {
  const error = data.toString();
  buildErrors += error;
  
  // Filter out warnings about missing API keys (expected during build)
  if (!error.includes('Missing API key') && 
      !error.includes('ANTHROPIC_API_KEY') && 
      !error.includes('OPENAI_API_KEY') &&
      !error.includes('dummy-test.supabase.co')) {
    process.stderr.write(error);
  }
});

// Handle EPIPE errors on the build process
buildProcess.on('error', (error) => {
  if (error.code === 'EPIPE') {
    console.log('✅ Handled EPIPE error during build process');
    return;
  }
  console.error('❌ Build process error:', error);
  process.exit(1);
});

// Handle process completion
buildProcess.on('close', (code) => {
  console.log('');
  
  if (code === 0) {
    console.log('✅ Build completed successfully!');
    
    // Check for common warnings and provide helpful messages
    if (buildErrors.includes('Missing API key') || buildOutput.includes('dummy-key-for-build')) {
      console.log('');
      console.log('💡 Note: Build used fallback values for missing API keys.');
      console.log('   Your app will work, but LLM features will show placeholder data.');
      console.log('   To enable full functionality, add your API keys to .env.local');
    }
    
    console.log('');
    console.log('🎉 Your app is ready for production!');
  } else {
    console.log('❌ Build failed with exit code:', code);
    
    // Provide helpful error messages
    if (buildErrors.includes('Module not found')) {
      console.log('');
      console.log('💡 Tip: Module not found errors may indicate missing dependencies.');
      console.log('   Try running: npm install');
    }
    
    if (buildErrors.includes('Type error')) {
      console.log('');
      console.log('💡 Tip: TypeScript errors found. Check the output above for details.');
      console.log('   You can temporarily disable strict checking in tsconfig.json if needed.');
    }
    
    process.exit(code);
  }
});

// Handle script interruption
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Build interrupted by user');
  buildProcess.kill('SIGINT');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('⚠️  Build terminated');
  buildProcess.kill('SIGTERM');
  process.exit(143);
});