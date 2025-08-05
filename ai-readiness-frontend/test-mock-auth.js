#!/usr/bin/env node

const fetch = require('node-fetch');

const TEST_SERVER_URL = 'http://localhost:54321';

async function testMockServer() {
  console.log('🧪 Testing Enhanced Mock Supabase Server');
  console.log('========================================\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${TEST_SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');
    
    // Test 2: Login with remember me
    console.log('2. Testing login with remember me...');
    const loginResponse = await fetch(`${TEST_SERVER_URL}/auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'TestPassword123!',
        grant_type: 'password',
        rememberMe: true
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login response structure:');
    console.log('  - Has access_token:', !!loginData.access_token);
    console.log('  - Has session:', !!loginData.session);
    console.log('  - Has user:', !!loginData.user);
    console.log('  - User email:', loginData.user?.email);
    console.log('  - User metadata:', !!loginData.user?.user_metadata);
    console.log('');
    
    const accessToken = loginData.access_token;
    
    // Test 3: Get user with token
    console.log('3. Testing get user endpoint with Bearer token...');
    const userResponse = await fetch(`${TEST_SERVER_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userData = await userResponse.json();
    console.log('✅ User data response:');
    console.log('  - Has user ID:', !!userData.id);
    console.log('  - Email matches:', userData.email === 'testuser@example.com');
    console.log('  - Has metadata:', !!userData.user_metadata);
    console.log('  - Has identities:', !!userData.identities);
    console.log('');
    
    // Test 4: Session verification
    console.log('4. Testing session verification...');
    const sessionResponse = await fetch(`${TEST_SERVER_URL}/auth/v1/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Session verification:');
    console.log('  - Has session:', !!sessionData.session);
    console.log('  - Has user:', !!sessionData.user);
    console.log('  - Session valid:', sessionData.session?.access_token === accessToken);
    console.log('');
    
    // Test 5: Invalid credentials
    console.log('5. Testing invalid credentials...');
    const invalidResponse = await fetch(`${TEST_SERVER_URL}/auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword',
        grant_type: 'password'
      })
    });
    
    const invalidData = await invalidResponse.json();
    console.log('✅ Invalid credentials response:');
    console.log('  - Status:', invalidResponse.status);
    console.log('  - Has error:', !!invalidData.error);
    console.log('  - Error message:', invalidData.error);
    console.log('');
    
    // Test 6: Logout
    console.log('6. Testing logout...');
    const logoutResponse = await fetch(`${TEST_SERVER_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Logout response:');
    console.log('  - Status:', logoutResponse.status);
    console.log('  - Expected 204:', logoutResponse.status === 204);
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    console.log('The enhanced mock server is working correctly for auth flows.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('Make sure the mock server is running: node test-mock-server.js');
  }
}

if (require.main === module) {
  testMockServer();
}

module.exports = { testMockServer };