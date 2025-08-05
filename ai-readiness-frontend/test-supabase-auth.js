#!/usr/bin/env node

/**
 * Test Supabase Authentication Directly
 * This script tests the Supabase authentication to see if the issue is with the credentials
 */

const { createClient } = require('@supabase/supabase-js');

async function testSupabaseAuth() {
  console.log('🧪 Testing Supabase Authentication...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key_replace_with_actual';
  
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Key Length: ${supabaseKey.length}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase client created successfully');
    
    // Test connection by getting session
    console.log('🔍 Testing connection...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('⚠️ Session check error:', sessionError.message);
    } else {
      console.log('✅ Session check successful (no active session expected)');
    }
    
    // Test login with test credentials
    console.log('🔐 Testing login with test credentials...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testuser@example.com',
      password: 'TestPassword123!'
    });
    
    if (error) {
      console.log('❌ Login failed:', error.message);
      console.log('   Error details:', error);
      
      // Check if it's a configuration issue
      if (error.message.includes('Invalid login credentials')) {
        console.log('💡 This suggests Supabase is working but test user doesn\'t exist');
        console.log('💡 Need to create test users or use proper test database');
        return 'USER_NOT_FOUND';
      } else if (error.message.includes('connect') || error.message.includes('network')) {
        console.log('💡 This suggests network/connection issues with Supabase');
        return 'CONNECTION_ERROR';
      } else {
        console.log('💡 This suggests configuration issues with Supabase');
        return 'CONFIG_ERROR';
      }
    } else {
      console.log('✅ Login successful!');
      console.log('👤 User:', data.user?.email);
      console.log('🎫 Session exists:', !!data.session);
      return 'SUCCESS';
    }
    
  } catch (error) {
    console.error('❌ Critical error:', error.message);
    return 'CRITICAL_ERROR';
  }
}

async function testSupabaseConnection() {
  console.log('🌐 Testing basic Supabase connectivity...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
  
  try {
    // Try to fetch the Supabase health endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key_replace_with_actual'
      }
    });
    
    console.log(`📡 HTTP Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Supabase API is reachable');
      return true;
    } else if (response.status === 401) {
      console.log('🔑 API reachable but authentication failed (expected with test keys)');
      return true;
    } else {
      console.log('❌ Unexpected response from Supabase API');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Cannot reach Supabase API:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 === SUPABASE AUTHENTICATION TEST ===');
  console.log('');
  
  // Test basic connectivity first
  const isConnectable = await testSupabaseConnection();
  console.log('');
  
  if (!isConnectable) {
    console.log('❌ Cannot connect to Supabase - this explains why e2e tests fail');
    console.log('💡 Recommendation: Set up proper Supabase instance or use mock auth for tests');
    process.exit(1);
  }
  
  // Test authentication
  const authResult = await testSupabaseAuth();
  console.log('');
  
  switch (authResult) {
    case 'SUCCESS':
      console.log('✅ === SUPABASE AUTH WORKING ===');
      console.log('✅ E2E tests should work with this configuration');
      break;
      
    case 'USER_NOT_FOUND':
      console.log('⚠️ === SUPABASE WORKING BUT NO TEST USERS ===');
      console.log('💡 Recommendation: Create test users or use test database');
      console.log('💡 E2E tests will fail until test users are available');
      break;
      
    case 'CONNECTION_ERROR':
      console.log('❌ === SUPABASE CONNECTION ISSUES ===');
      console.log('💡 Recommendation: Check network, Supabase instance status');
      break;
      
    case 'CONFIG_ERROR':
      console.log('❌ === SUPABASE CONFIGURATION ISSUES ===');
      console.log('💡 Recommendation: Verify URL and API keys are correct');
      break;
      
    default:
      console.log('❌ === SUPABASE CRITICAL ERROR ===');
      console.log('💡 Recommendation: Review Supabase setup completely');
  }
}

if (require.main === module) {
  main().catch(console.error);
}