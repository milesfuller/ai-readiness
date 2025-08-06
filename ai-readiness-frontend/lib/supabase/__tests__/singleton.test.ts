/**
 * Test suite for Supabase client singleton behavior
 * Ensures that "Multiple GoTrueClient instances" warning is prevented
 */

import { jest } from '@jest/globals'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

describe('Supabase Client Singleton', () => {
  beforeEach(() => {
    // Clear the module cache to test fresh instances
    jest.resetModules()
  })

  afterEach(() => {
    // Clear singleton registry after each test
    const { clearClients } = require('../singleton')
    clearClients()
  })

  it('should return the same client instance on multiple calls', async () => {
    const { createClient } = await import('../client')
    
    const client1 = createClient()
    const client2 = createClient()
    
    expect(client1).toBe(client2) // Same reference
  })

  it('should return the same browser client instance on multiple calls', async () => {
    // Mock browser environment
    Object.defineProperty(window, 'document', {
      value: { cookie: '' },
      writable: true
    })
    
    const { createBrowserClient } = await import('../client-browser')
    
    const client1 = createBrowserClient()
    const client2 = createBrowserClient()
    
    expect(client1).toBe(client2) // Same reference
  })

  it('should maintain separate instances for different client types', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('../client-browser')
    
    const generalClient = createClient()
    const browserClient = createBrowserClient()
    
    expect(generalClient).not.toBe(browserClient) // Different references for different types
  })

  it('should track client instances in the registry', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('../client-browser')
    const { getRegistryStatus } = await import('../singleton')
    
    // Initially no clients
    let status = getRegistryStatus()
    expect(status.general).toBe(false)
    expect(status.browser).toBe(false)
    
    // Create clients
    createClient()
    createBrowserClient()
    
    // Should be registered
    status = getRegistryStatus()
    expect(status.general).toBe(true)
    expect(status.browser).toBe(true)
  })

  it('should clear all clients when requested', async () => {
    const { createClient } = await import('../client')
    const { createBrowserClient } = await import('../client-browser')
    const { clearClients, getRegistryStatus } = await import('../singleton')
    
    // Create clients
    createClient()
    createBrowserClient()
    
    // Verify they exist
    let status = getRegistryStatus()
    expect(status.general).toBe(true)
    expect(status.browser).toBe(true)
    
    // Clear them
    clearClients()
    
    // Verify they're gone
    status = getRegistryStatus()
    expect(status.general).toBe(false)
    expect(status.browser).toBe(false)
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
    
    // Both should have the same configuration
    expect(client1.supabaseUrl).toBe(client2.supabaseUrl)
    expect(client1.supabaseKey).toBe(client2.supabaseKey)
    
    // Should have correct application name header
    const headers = (client1 as any).rest.headers
    expect(headers['x-application-name']).toBe('ai-readiness')
  })
})