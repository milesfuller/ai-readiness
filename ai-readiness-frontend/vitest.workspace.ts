import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Main test configuration
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['**/__tests__/components/**/*.{test,spec}.{ts,tsx}'],
      environment: 'happy-dom'
    }
  },
  
  // API/Integration tests
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['**/__tests__/api/**/*.{test,spec}.{ts,tsx}'],
      environment: 'node'
    }
  },

  // Security tests
  {
    extends: './vitest.config.ts',
    test: {
      name: 'security',
      include: ['**/__tests__/lib/security/**/*.{test,spec}.{ts,tsx}'],
      environment: 'node'
    }
  }
])