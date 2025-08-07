/**
 * Test suite for Supabase client simplified singleton behavior
 * Ensures that the new simplified client structure works correctly
 */

import { vi } from 'vitest'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

describe('Supabase Client Simplified Singleton', () => {
  beforeEach(() => {
    // Clear the module cache to test fresh instances
    vi.resetModules()
  })

  afterEach(() => {
    // Clear client instance after each test
    const { clearClient } = require('../client')
    clearClient()
  })

  it('should return the same client instance on multiple calls', async () => {
    const { createClient } = await import('../client')
    
    const client1 = createClient()
    const client2 = createClient()
    
    expect(client1).toBe(client2) // Same reference
  })

  it('should return the same browser client instance using alias', async () => {
    // Mock browser environment
    Object.defineProperty(window, 'document', {
      value: { cookie: '' },
      writable: true
    })
    
    const { createBrowserClient } = await import('../client')
    
    const client1 = createBrowserClient()
    const client2 = createBrowserClient()
    
    expect(client1).toBe(client2) // Same reference
  })

  it('should use the same instance for createClient and createBrowserClient aliases', async () => {
    const { createClient, createBrowserClient } = await import('../client')
    
    const client1 = createClient()
    const client2 = createBrowserClient()
    
    expect(client1).toBe(client2) // Same reference since they're aliases
  })

  it('should track client instance existence', async () => {
    const { createClient, hasClientInstance } = await import('../client')
    
    // Initially no client
    expect(hasClientInstance()).toBe(false)
    
    // Create client
    createClient()
    
    // Should be tracked
    expect(hasClientInstance()).toBe(true)
  })

  it('should clear client when requested', async () => {
    const { createClient, clearClient, hasClientInstance } = await import('../client')
    
    // Create client
    createClient()
    
    // Verify it exists
    expect(hasClientInstance()).toBe(true)
    
    // Clear it
    clearClient()
    
    // Verify it's gone
    expect(hasClientInstance()).toBe(false)
  })

  it('should handle unified client getter', async () => {
    // Mock browser environment
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true
    })
    
    const { getSupabaseClientSync } = await import('../index')
    
    const client1 = getSupabaseClientSync()
    const client2 = getSupabaseClientSync()
    
    expect(client1).toBe(client2) // Same reference through unified getter
  })

  it('should throw error for sync client in non-browser environment', async () => {
    // Remove window to simulate server environment
    const originalWindow = global.window
    // @ts-ignore
    delete global.window
    
    try {
      const { getSupabaseClientSync } = await import('../index')
      
      expect(() => {
        getSupabaseClientSync()
      }).toThrow('getSupabaseClientSync can only be used in browser environments')
    } finally {
      // Restore window
      global.window = originalWindow
    }
  })

  it('should preserve client configuration in singleton', async () => {
    const { createClient } = await import('../client')
    
    const client1 = createClient()
    const client2 = createClient()
    
    // Both should have the same configuration (accessing through the client instance)
    expect((client1 as any).supabaseUrl).toBe((client2 as any).supabaseUrl)
    expect((client1 as any).supabaseKey).toBe((client2 as any).supabaseKey)
    
    // Should have correct application name header
    const headers = (client1 as any).rest.headers
    expect(headers['x-application-name']).toBe('ai-readiness')
  })

  it('should create new instance after clearing', async () => {
    const { createClient, clearClient } = await import('../client')
    
    const client1 = createClient()
    clearClient()
    const client2 = createClient()
    
    // Should be different instances but same configuration
    expect(client1).not.toBe(client2)
    expect((client1 as any).supabaseUrl).toBe((client2 as any).supabaseUrl)
  })
})