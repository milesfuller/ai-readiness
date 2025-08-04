// Test environment setup
// Sets up environment variables for Supabase testing

// Load test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54322/postgres'
process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret-for-nextauth-should-be-32-chars-min'
process.env.DISABLE_RATE_LIMITING = 'true'

// Test user credentials
process.env.TEST_USER_EMAIL = 'test@example.com'
process.env.TEST_USER_PASSWORD = 'TestPassword123!'
process.env.TEST_ADMIN_EMAIL = 'admin@example.com'
process.env.TEST_ADMIN_PASSWORD = 'AdminPassword123!'

// Mock LLM API keys
process.env.ANTHROPIC_API_KEY = 'test-key-for-mock-responses'
process.env.OPENAI_API_KEY = 'test-key-for-mock-responses'

console.log('✅ Test environment variables loaded')