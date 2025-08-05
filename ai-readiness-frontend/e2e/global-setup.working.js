/**
 * Global Test Setup for Working Tests
 * Sets up test environment and validates all services are ready
 */

async function globalSetup() {
  console.log('🚀 Setting up working test environment...');
  
  // Validate environment variables
  const requiredEnvVars = [
    'PLAYWRIGHT_BASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
  
  // Wait for services to be ready
  await waitForService(process.env.PLAYWRIGHT_BASE_URL, 'Next.js App');
  await waitForService(process.env.NEXT_PUBLIC_SUPABASE_URL, 'Mock Supabase');
  
  console.log('✅ All services are ready for testing');
}

async function waitForService(url, name, maxAttempts = 30) {
  console.log(`⏳ Waiting for ${name} at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${url}/health`).catch(() => 
        fetch(url).catch(() => null)
      );
      
      if (response && response.ok) {
        console.log(`✅ ${name} is ready!`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    if (attempt === maxAttempts) {
      console.error(`❌ ${name} failed to start after ${maxAttempts} attempts`);
      process.exit(1);
    }
    
    console.log(`   Attempt ${attempt}/${maxAttempts} - ${name} not ready yet...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

export default globalSetup;