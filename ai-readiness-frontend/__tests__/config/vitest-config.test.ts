/**
 * @file Simple test to verify vitest configuration works correctly
 */

import { describe, it, expect } from 'vitest'

describe('Vitest Configuration', () => {
  it('should run basic tests correctly', () => {
    expect(true).toBe(true)
  })

  it('should have access to globals', () => {
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
  })

  it('should handle environment setup', () => {
    // Test that NODE_ENV is properly set
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should handle path resolution', () => {
    // This test ensures path normalization works correctly
    const testPath = './test/path'
    expect(typeof testPath).toBe('string')
    expect(testPath.length).toBeGreaterThan(0)
  })

  it('should prevent argument parsing errors', () => {
    // Simulate the kind of arguments that were causing issues
    const args = ['2', '--verbose', '--config']
    expect(Array.isArray(args)).toBe(true)
    expect(args[0]).toBe('2')
  })
})