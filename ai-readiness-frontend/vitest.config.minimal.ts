import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'e2e',
      'e2e/**/*',
      'tests/e2e/**/*',
      '**/*.e2e.{test,spec}.{js,ts,jsx,tsx}',
      '**/e2e/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/accessibility/**/*',
      'tests/load/**/*', 
      'tests/performance/**/*',
      'tests/visual/**/*',
      'playwright-report',
      'test-results'
    ],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '~/': resolve(__dirname, './'),
      'components': resolve(__dirname, './components'),
      'lib': resolve(__dirname, './lib'),
      'app': resolve(__dirname, './app'),
      'types': resolve(__dirname, './types'),
      'utils': resolve(__dirname, './lib/utils')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
})