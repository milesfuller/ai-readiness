# EPIPE-Safe Testing Utilities

This directory contains utilities for preventing EPIPE (Broken Pipe) errors during parallel Playwright test execution.

## Overview

EPIPE errors occur when there are too many concurrent connections or when connections are abruptly closed. This is common in parallel testing environments where multiple browser instances try to connect simultaneously.

## Components

### 1. Connection Pool Manager (`connection-pool.ts`)

A sophisticated connection pooling system that:

- **Limits concurrent connections** to prevent resource exhaustion
- **Implements retry logic** with exponential backoff
- **Provides connection metrics** for monitoring
- **Handles graceful shutdown** to prevent resource leaks
- **Monitors connection health** with real-time status

**Key Features:**
- Configurable connection limits
- Automatic idle connection cleanup
- EPIPE error detection and handling
- Performance metrics and monitoring
- Process signal handlers for cleanup

### 2. EPIPE-Safe Test Runner (`epipe-safe-runner.ts`)

An enhanced Playwright test runner that:

- **Manages browser contexts** with connection pooling
- **Implements automatic retry** for failed operations
- **Provides test isolation** with proper cleanup
- **Monitors test metrics** including EPIPE errors
- **Handles graceful failures** with detailed logging

**Usage:**
```typescript
import { test, expect } from './utils/epipe-safe-runner';

test('safe test', async ({ safePage, testContext }) => {
  await safePage.goto('/');
  expect(testContext.metrics.epipeErrors).toBe(0);
});
```

### 3. Enhanced Playwright Configuration (`../playwright.config.ts`)

Updated configuration that:

- **Reduces concurrent workers** to prevent connection overload
- **Implements connection limits** in browser args
- **Configures proper timeouts** for slow connections
- **Enables comprehensive reporting** for debugging
- **Sets up global setup/teardown** for resource management

## Configuration Options

### Connection Pool Options

```typescript
interface ConnectionPoolOptions {
  maxConcurrent: number;     // Max concurrent connections (default: 4)
  maxRetries: number;        // Max retry attempts (default: 3)
  retryDelay: number;        // Base retry delay in ms (default: 1000)
  connectionTimeout: number; // Connection timeout (default: 30000)
  idleTimeout: number;       // Idle connection timeout (default: 60000)
  enableMetrics: boolean;    // Enable metrics collection (default: true)
}
```

### Test Runner Options

```typescript
interface EPIPESafeOptions {
  maxRetries: number;        // Max test retries (default: 3)
  retryDelay: number;        // Base retry delay (default: 1000)
  connectionTimeout: number; // Test timeout (default: 30000)
  enableMetrics: boolean;    // Enable metrics (default: true)
  logLevel: string;          // Log level (default: 'info')
}
```

## Usage Examples

### Basic Safe Test
```typescript
import { test, expect } from './utils/epipe-safe-runner';

test('basic navigation', async ({ safePage }) => {
  await safePage.goto('/dashboard');
  await expect(safePage.locator('h1')).toBeVisible();
});
```

### With Metrics Monitoring
```typescript
test('with metrics', async ({ safePage, testContext }) => {
  await safePage.goto('/');
  
  console.log('Connection ID:', testContext.connectionId);
  console.log('Page loads:', testContext.metrics.pageLoads);
  console.log('EPIPE errors:', testContext.metrics.epipeErrors);
});
```

### Custom Retry Logic
```typescript
import { withRetry } from './utils/epipe-safe-runner';

test('custom retry', async ({ safePage }) => {
  await withRetry(async () => {
    await safePage.goto('/unstable-endpoint');
    await expect(safePage.locator('.content')).toBeVisible();
  }, 5, 2000); // 5 retries, 2s delay
});
```

## NPM Scripts

- `npm run test:epipe-safe` - Run tests with reduced workers (2)
- `npm run test:parallel` - Run tests with parallel execution (4 workers)
- `npm run test:ci` - Run tests optimized for CI environment
- `npm run test:metrics` - Run tests with detailed metrics reporting

## Monitoring and Metrics

### Connection Pool Metrics
- Active connections count
- Total connections created
- Failed connection attempts
- EPIPE error count
- Average connection time
- Health score (0-100)

### Test Metrics
- Page loads per test
- Network requests count
- Error counts by type
- Retry attempts
- Connection pool status

## Best Practices

### 1. Connection Management
- Use the default connection pool for most cases
- Customize pool size based on system resources
- Monitor health scores and adjust limits accordingly

### 2. Test Design
- Keep tests focused and short
- Avoid unnecessary page navigations
- Use `waitForLoadState('networkidle')` for stability

### 3. Parallel Execution
- Start with 2 workers and scale up gradually
- Monitor EPIPE error rates
- Reduce workers if error rates exceed 10%

### 4. CI/CD Integration
- Use reduced worker counts in CI environments
- Enable comprehensive logging for debugging
- Set up proper resource limits

## Troubleshooting

### High EPIPE Error Rates
1. Reduce the number of parallel workers
2. Increase connection pool size
3. Add delays between operations
4. Check system resource limits

### Connection Timeouts
1. Increase `connectionTimeout` setting
2. Check network stability
3. Reduce concurrent connections
4. Add retry logic with longer delays

### Memory Issues
1. Enable idle connection cleanup
2. Reduce `idleTimeout` setting
3. Monitor connection pool metrics
4. Implement proper test isolation

## Performance Optimization

### Connection Pool Tuning
```typescript
const optimizedPool = createConnectionPool({
  maxConcurrent: 2,        // Conservative for stability
  maxRetries: 5,           // More retries for unstable networks
  retryDelay: 500,         // Faster retries
  connectionTimeout: 45000, // Longer timeout for slow networks
  idleTimeout: 30000       // Faster cleanup
});
```

### Browser Configuration
```javascript
// In playwright.config.ts
launchOptions: {
  args: [
    '--max-connections-per-host=2',
    '--max-connections-per-proxy=2',
    '--disable-background-timer-throttling'
  ],
  slowMo: process.env.CI ? 100 : 0
}
```

## Monitoring Dashboard

The connection pool provides real-time metrics:

```typescript
const status = defaultConnectionPool.getStatus();
console.log(`Health Score: ${status.healthScore}%`);
console.log(`Active: ${status.activeConnections}/${status.maxConcurrent}`);
```

For detailed monitoring, enable metrics collection and check logs for:
- Connection creation/destruction events
- EPIPE error patterns
- Retry attempt statistics
- Resource utilization trends