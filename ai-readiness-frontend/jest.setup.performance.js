/**
 * Performance testing setup for Jest
 * Configures benchmarking and performance measurement utilities
 */

// Performance measurement utilities
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => [],
  clearMarks: () => {},
  clearMeasures: () => {}
};

// Benchmark utility function
global.benchmark = async (name, fn, iterations = 1000) => {
  const results = [];
  
  // Warmup
  for (let i = 0; i < Math.min(iterations / 10, 100); i++) {
    await fn();
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    results.push(end - start);
  }
  
  const avg = results.reduce((sum, time) => sum + time, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  const median = results.sort((a, b) => a - b)[Math.floor(results.length / 2)];
  
  console.log(`📊 Benchmark: ${name}`);
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Median:  ${median.toFixed(2)}ms`);
  console.log(`   Min:     ${min.toFixed(2)}ms`);
  console.log(`   Max:     ${max.toFixed(2)}ms`);
  console.log(`   Iterations: ${iterations}`);
  
  return { avg, min, max, median, iterations, results };
};

// Memory usage tracking
global.getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      rss: performance.memory.usedJSHeapSize,
      heapTotal: performance.memory.totalJSHeapSize,
      heapUsed: performance.memory.usedJSHeapSize,
      external: 0
    };
  }
  
  return null;
};

// Performance assertions
global.expectPerformance = (actualTime, maxTime, testName = 'test') => {
  if (actualTime > maxTime) {
    throw new Error(
      `Performance test failed: ${testName} took ${actualTime.toFixed(2)}ms, ` +
      `expected less than ${maxTime}ms`
    );
  }
  console.log(`✅ Performance test passed: ${testName} (${actualTime.toFixed(2)}ms)`);
};

// Component render time measurement
global.measureRenderTime = async (component) => {
  const { render } = require('@testing-library/react');
  
  const start = performance.now();
  const result = render(component);
  const end = performance.now();
  
  return {
    renderTime: end - start,
    result
  };
};

// API response time measurement
global.measureApiResponseTime = async (apiCall) => {
  const start = performance.now();
  const response = await apiCall();
  const end = performance.now();
  
  return {
    responseTime: end - start,
    response
  };
};

// Custom performance matchers
expect.extend({
  toBeFasterThan(received, expected) {
    const pass = received < expected;
    return {
      message: () =>
        pass
          ? `Expected ${received}ms not to be faster than ${expected}ms`
          : `Expected ${received}ms to be faster than ${expected}ms`,
      pass,
    };
  },
  
  toHaveMemoryUsageLessThan(received, expected) {
    const memoryUsage = received.heapUsed || received;
    const pass = memoryUsage < expected;
    return {
      message: () =>
        pass
          ? `Expected memory usage ${memoryUsage} bytes not to be less than ${expected} bytes`
          : `Expected memory usage ${memoryUsage} bytes to be less than ${expected} bytes`,
      pass,
    };
  }
});

// Performance test timeout setup
jest.setTimeout(30000);

// Console performance logger
const originalLog = console.log;
console.log = (...args) => {
  if (args[0] && args[0].includes('📊')) {
    // Performance logs - always show
    originalLog(...args);
  } else if (process.env.VERBOSE_TESTS) {
    originalLog(...args);
  }
};

console.info('🚀 Performance testing setup complete');