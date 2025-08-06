/**
 * Supabase Client Singleton Manager
 * 
 * This module ensures that only one GoTrueClient instance exists per context
 * to prevent the "Multiple GoTrueClient instances" warning.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Global registry for all Supabase client instances
interface ClientRegistry {
  browser?: SupabaseClient
  server?: SupabaseClient
  general?: SupabaseClient
}

// Use a global symbol for true singleton behavior across module reloads
const SUPABASE_SINGLETON_KEY = Symbol.for('__supabase_singleton_registry__')

declare global {
  var __supabaseRegistry: ClientRegistry | undefined
}

/**
 * Get the global client registry, initializing if necessary
 */
function getClientRegistry(): ClientRegistry {
  // Use both globalThis and global for maximum compatibility
  const globalObj = (typeof globalThis !== 'undefined' ? globalThis : global) as any
  
  if (!globalObj.__supabaseRegistry) {
    globalObj.__supabaseRegistry = {}
  }
  return globalObj.__supabaseRegistry
}

/**
 * Register a client instance in the global registry
 */
export function registerClient(type: keyof ClientRegistry, client: SupabaseClient): SupabaseClient {
  const registry = getClientRegistry()
  
  // If client already exists, return the existing one
  if (registry[type]) {
    console.debug(`[Supabase Singleton] Returning existing ${type} client`)
    return registry[type]!
  }
  
  // Register new client
  registry[type] = client
  console.debug(`[Supabase Singleton] Registered new ${type} client`)
  
  return client
}

/**
 * Get an existing client from the registry
 */
export function getClient(type: keyof ClientRegistry): SupabaseClient | undefined {
  const registry = getClientRegistry()
  return registry[type]
}

/**
 * Clear all clients (useful for testing)
 */
export function clearClients(): void {
  const globalObj = (typeof globalThis !== 'undefined' ? globalThis : global) as any
  if (globalObj.__supabaseRegistry) {
    globalObj.__supabaseRegistry = {}
  }
  console.debug('[Supabase Singleton] Cleared all clients')
}

/**
 * Get registry status for debugging
 */
export function getRegistryStatus(): { [K in keyof ClientRegistry]: boolean } {
  const registry = getClientRegistry()
  return {
    browser: !!registry.browser,
    server: !!registry.server,
    general: !!registry.general
  }
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanup(): void {
  console.debug('[Supabase Singleton] Performing cleanup')
  clearClients()
}

// Cleanup on process termination (Node.js environments)
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
}

// Cleanup on page unload (browser environments)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup)
}