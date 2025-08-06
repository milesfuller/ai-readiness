/**
 * Mock Integration Manager
 * Manages mock service configuration, validation, and integration with application
 */

import { EventEmitter } from 'events';

export interface MockBehavior {
  serviceId: string;
  endpoint: string;
  method: string;
  response: {
    status: number;
    body: any;
    headers?: Record<string, string>;
    delay?: number;
  };
  conditions?: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  };
}

export interface APIContract {
  endpoint: string;
  method: string;
  requestSchema: any;
  responseSchema: any;
  statusCodes: number[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export interface IntegrationResult {
  valid: boolean;
  testedEndpoints: string[];
  failedEndpoints: string[];
  warnings: string[];
  details: Record<string, any>;
}

export interface MockReport {
  timestamp: Date;
  totalMocks: number;
  activeMocks: number;
  requestCounts: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
  mostUsedEndpoints: Array<{ endpoint: string; count: number }>;
}

export interface MockScenario {
  id: string;
  name: string;
  description: string;
  behaviors: MockBehavior[];
  duration?: number;
  conditions?: {
    startTime?: Date;
    endTime?: Date;
    triggerEvents?: string[];
  };
}

export interface MockServerConfig {
  baseUrl: string;
  adminPort: number;
  mockPort: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  persistence: boolean;
  cors: boolean;
}

export class MockIntegrationManager extends EventEmitter {
  private config: MockServerConfig;
  private activeMocks: Map<string, MockBehavior> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private responseMetrics: Array<{ endpoint: string; responseTime: number; timestamp: Date }> = [];
  private mockScenarios: Map<string, MockScenario> = new Map();

  constructor(config?: Partial<MockServerConfig>) {
    super();
    
    this.config = {
      baseUrl: process.env.MOCK_SERVER_URL || 'http://localhost:3001',
      adminPort: 1080,
      mockPort: 3001,
      logLevel: 'info',
      persistence: false,
      cors: true,
      ...config
    };
  }

  /**
   * Configure mock behaviors for test scenarios
   */
  async configureMockBehaviors(behaviors: MockBehavior[]): Promise<void> {
    console.log(`🎭 Configuring ${behaviors.length} mock behaviors...`);

    try {
      // Clear existing mocks
      await this.clearAllMocks();

      // Group behaviors by service
      const behaviorsByService = this.groupBehaviorsByService(behaviors);

      // Configure mocks for each service
      for (const [serviceId, serviceBehaviors] of behaviorsByService.entries()) {
        await this.configureServiceMocks(serviceId, serviceBehaviors);
      }

      // Store active mocks
      behaviors.forEach(behavior => {
        const key = `${behavior.method}:${behavior.endpoint}`;
        this.activeMocks.set(key, behavior);
      });

      console.log('✅ Mock behaviors configured successfully');
      this.emit('mocks:configured', behaviors);

    } catch (error) {
      console.error('❌ Failed to configure mock behaviors:', error);
      this.emit('mocks:configuration_failed', error);
      throw error;
    }
  }

  /**
   * Validate mock responses against API contracts
   */
  async validateMockResponses(contracts: APIContract[]): Promise<ValidationResult> {
    console.log(`🔍 Validating ${contracts.length} API contracts against mocks...`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    try {
      for (const contract of contracts) {
        const mockKey = `${contract.method}:${contract.endpoint}`;
        const mock = this.activeMocks.get(mockKey);

        if (!mock) {
          warnings.push(`No mock configured for ${contract.method} ${contract.endpoint}`);
          continue;
        }

        // Validate response schema
        const schemaValidation = await this.validateResponseSchema(
          mock.response,
          contract.responseSchema
        );

        if (!schemaValidation.valid) {
          errors.push(`Schema validation failed for ${mockKey}: ${schemaValidation.errors.join(', ')}`);
        }

        // Validate status codes
        if (!contract.statusCodes.includes(mock.response.status)) {
          errors.push(`Invalid status code ${mock.response.status} for ${mockKey}. Expected: ${contract.statusCodes.join(', ')}`);
        }

        details[mockKey] = {
          mock,
          contract,
          schemaValidation
        };
      }

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        details
      };

      console.log(`✅ Mock validation completed: ${result.valid ? 'PASSED' : 'FAILED'}`);
      this.emit('mocks:validated', result);

      return result;

    } catch (error) {
      console.error('❌ Mock validation failed:', error);
      const result: ValidationResult = {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
        details
      };

      this.emit('mocks:validation_failed', result);
      return result;
    }
  }

  /**
   * Update mock behavior dynamically
   */
  async updateMockBehavior(serviceId: string, behavior: MockBehavior): Promise<void> {
    console.log(`🔄 Updating mock behavior for ${serviceId}: ${behavior.method} ${behavior.endpoint}`);

    try {
      // Update mock server configuration
      await this.updateMockServerBehavior(behavior);

      // Update local tracking
      const key = `${behavior.method}:${behavior.endpoint}`;
      this.activeMocks.set(key, behavior);

      console.log('✅ Mock behavior updated successfully');
      this.emit('mock:updated', { serviceId, behavior });

    } catch (error) {
      console.error('❌ Failed to update mock behavior:', error);
      this.emit('mock:update_failed', { serviceId, behavior, error });
      throw error;
    }
  }

  /**
   * Reset all mock states
   */
  async resetMockState(): Promise<void> {
    console.log('🔄 Resetting mock state...');

    try {
      // Clear mock server state
      await this.clearAllMocks();

      // Reset local state
      this.activeMocks.clear();
      this.requestCounts.clear();
      this.responseMetrics.length = 0;

      console.log('✅ Mock state reset successfully');
      this.emit('mocks:reset');

    } catch (error) {
      console.error('❌ Failed to reset mock state:', error);
      this.emit('mocks:reset_failed', error);
      throw error;
    }
  }

  /**
   * Validate mock-to-app integration
   */
  async validateMockToAppIntegration(): Promise<IntegrationResult> {
    console.log('🔍 Validating mock-to-app integration...');

    const testedEndpoints: string[] = [];
    const failedEndpoints: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    try {
      // Test each active mock endpoint
      for (const [mockKey, behavior] of this.activeMocks.entries()) {
        try {
          const testResult = await this.testMockEndpoint(behavior);
          
          if (testResult.success) {
            testedEndpoints.push(mockKey);
          } else {
            failedEndpoints.push(mockKey);
          }

          details[mockKey] = testResult;

        } catch (error) {
          failedEndpoints.push(mockKey);
          details[mockKey] = { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }

      // Check for common integration issues
      const integrationWarnings = await this.checkIntegrationWarnings();
      warnings.push(...integrationWarnings);

      const result: IntegrationResult = {
        valid: failedEndpoints.length === 0,
        testedEndpoints,
        failedEndpoints,
        warnings,
        details
      };

      console.log(`✅ Integration validation completed: ${result.valid ? 'PASSED' : 'FAILED'}`);
      this.emit('integration:validated', result);

      return result;

    } catch (error) {
      console.error('❌ Integration validation failed:', error);
      const result: IntegrationResult = {
        valid: false,
        testedEndpoints,
        failedEndpoints,
        warnings: [...warnings, `Validation error: ${error instanceof Error ? error.message : String(error)}`],
        details
      };

      this.emit('integration:validation_failed', result);
      return result;
    }
  }

  /**
   * Generate comprehensive mock report
   */
  async generateMockReport(): Promise<MockReport> {
    console.log('📊 Generating mock usage report...');

    const totalMocks = this.activeMocks.size;
    const activeMocks = Array.from(this.requestCounts.values()).filter(count => count > 0).length;
    
    const totalResponseTime = this.responseMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    const averageResponseTime = this.responseMetrics.length > 0 ? 
      totalResponseTime / this.responseMetrics.length : 0;

    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorRequests = 0; // Would be tracked from actual error responses
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    const mostUsedEndpoints = Array.from(this.requestCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const report: MockReport = {
      timestamp: new Date(),
      totalMocks,
      activeMocks,
      requestCounts: Object.fromEntries(this.requestCounts),
      averageResponseTime,
      errorRate,
      mostUsedEndpoints
    };

    console.log('✅ Mock report generated successfully');
    this.emit('report:generated', report);

    return report;
  }

  /**
   * Create and activate a mock scenario
   */
  async createMockScenario(scenario: MockScenario): Promise<void> {
    console.log(`🎬 Creating mock scenario: ${scenario.name}`);

    try {
      // Store scenario
      this.mockScenarios.set(scenario.id, scenario);

      // Configure behaviors
      await this.configureMockBehaviors(scenario.behaviors);

      // Set up scenario conditions
      if (scenario.conditions) {
        await this.setupScenarioConditions(scenario);
      }

      console.log('✅ Mock scenario created successfully');
      this.emit('scenario:created', scenario);

    } catch (error) {
      console.error('❌ Failed to create mock scenario:', error);
      this.emit('scenario:creation_failed', { scenario, error });
      throw error;
    }
  }

  /**
   * Activate a specific mock scenario
   */
  async activateScenario(scenarioId: string): Promise<void> {
    const scenario = this.mockScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Mock scenario not found: ${scenarioId}`);
    }

    console.log(`🎬 Activating mock scenario: ${scenario.name}`);

    try {
      await this.configureMockBehaviors(scenario.behaviors);
      
      console.log('✅ Mock scenario activated successfully');
      this.emit('scenario:activated', scenario);

    } catch (error) {
      console.error('❌ Failed to activate mock scenario:', error);
      this.emit('scenario:activation_failed', { scenario, error });
      throw error;
    }
  }

  /**
   * Get mock statistics
   */
  getMockStatistics(): {
    totalMocks: number;
    activeMocks: number;
    totalRequests: number;
    averageResponseTime: number;
  } {
    const totalMocks = this.activeMocks.size;
    const activeMocks = Array.from(this.requestCounts.values()).filter(count => count > 0).length;
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const totalResponseTime = this.responseMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    const averageResponseTime = this.responseMetrics.length > 0 ? 
      totalResponseTime / this.responseMetrics.length : 0;

    return {
      totalMocks,
      activeMocks,
      totalRequests,
      averageResponseTime
    };
  }

  // Private helper methods

  private groupBehaviorsByService(behaviors: MockBehavior[]): Map<string, MockBehavior[]> {
    const grouped = new Map<string, MockBehavior[]>();

    behaviors.forEach(behavior => {
      const serviceId = behavior.serviceId;
      if (!grouped.has(serviceId)) {
        grouped.set(serviceId, []);
      }
      grouped.get(serviceId)!.push(behavior);
    });

    return grouped;
  }

  private async configureServiceMocks(serviceId: string, behaviors: MockBehavior[]): Promise<void> {
    console.log(`🎭 Configuring ${behaviors.length} mocks for service: ${serviceId}`);

    // Convert behaviors to MockServer format
    const mockServerExpectations = behaviors.map(behavior => ({
      httpRequest: {
        method: behavior.method,
        path: behavior.endpoint,
        ...(behavior.conditions?.headers && { headers: behavior.conditions.headers }),
        ...(behavior.conditions?.query && { queryStringParameters: behavior.conditions.query }),
        ...(behavior.conditions?.body && { body: behavior.conditions.body })
      },
      httpResponse: {
        statusCode: behavior.response.status,
        body: JSON.stringify(behavior.response.body),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          ...behavior.response.headers
        },
        ...(behavior.response.delay && { delay: { timeUnit: 'MILLISECONDS', value: behavior.response.delay } })
      }
    }));

    // Send to MockServer
    await this.sendToMockServer('/mockserver/expectation', {
      method: 'PUT',
      body: JSON.stringify(mockServerExpectations),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private async clearAllMocks(): Promise<void> {
    try {
      await this.sendToMockServer('/mockserver/clear', {
        method: 'PUT'
      });
    } catch (error) {
      console.warn('⚠️ Failed to clear existing mocks:', error);
    }
  }

  private async updateMockServerBehavior(behavior: MockBehavior): Promise<void> {
    const expectation = {
      httpRequest: {
        method: behavior.method,
        path: behavior.endpoint
      },
      httpResponse: {
        statusCode: behavior.response.status,
        body: JSON.stringify(behavior.response.body),
        headers: {
          'Content-Type': 'application/json',
          ...behavior.response.headers
        }
      }
    };

    await this.sendToMockServer('/mockserver/expectation', {
      method: 'PUT',
      body: JSON.stringify(expectation),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private async sendToMockServer(path: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`MockServer request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private async validateResponseSchema(response: any, schema: any): Promise<ValidationResult> {
    // Simplified schema validation - in practice, would use JSON Schema validator
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic type checking
      if (schema.type && typeof response.body !== schema.type) {
        errors.push(`Response body type mismatch. Expected: ${schema.type}, Got: ${typeof response.body}`);
      }

      // Check required properties if schema has them
      if (schema.required && Array.isArray(schema.required)) {
        const responseBody = response.body || {};
        for (const requiredField of schema.required) {
          if (!(requiredField in responseBody)) {
            errors.push(`Missing required field: ${requiredField}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        details: { schema, response }
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
        details: { schema, response }
      };
    }
  }

  private async testMockEndpoint(behavior: MockBehavior): Promise<{
    success: boolean;
    responseTime: number;
    status: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const url = `${this.config.baseUrl}${behavior.endpoint}`;
      const response = await fetch(url, {
        method: behavior.method,
        headers: {
          'Content-Type': 'application/json',
          ...behavior.conditions?.headers
        },
        ...(behavior.conditions?.body && { body: JSON.stringify(behavior.conditions.body) })
      });

      const responseTime = Date.now() - startTime;

      // Track metrics
      this.recordMockUsage(behavior.endpoint, responseTime);

      return {
        success: response.status === behavior.response.status,
        responseTime,
        status: response.status
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        status: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkIntegrationWarnings(): Promise<string[]> {
    const warnings: string[] = [];

    // Check for unused mocks
    const unusedMocks = Array.from(this.activeMocks.entries())
      .filter(([key]) => !this.requestCounts.has(key) || this.requestCounts.get(key) === 0)
      .map(([key]) => key);

    if (unusedMocks.length > 0) {
      warnings.push(`${unusedMocks.length} unused mocks detected: ${unusedMocks.join(', ')}`);
    }

    // Check for high response times
    const slowEndpoints = this.responseMetrics
      .filter(metric => metric.responseTime > 1000)
      .map(metric => metric.endpoint);

    if (slowEndpoints.length > 0) {
      warnings.push(`Slow mock responses detected: ${[...new Set(slowEndpoints)].join(', ')}`);
    }

    return warnings;
  }

  private async setupScenarioConditions(scenario: MockScenario): Promise<void> {
    // Setup time-based conditions
    if (scenario.conditions?.startTime || scenario.conditions?.endTime) {
      console.log(`⏰ Setting up time-based conditions for scenario: ${scenario.name}`);
      // Implementation would set up timers
    }

    // Setup event-based triggers
    if (scenario.conditions?.triggerEvents) {
      console.log(`🎯 Setting up event triggers for scenario: ${scenario.name}`);
      // Implementation would set up event listeners
    }
  }

  private recordMockUsage(endpoint: string, responseTime: number): void {
    // Update request count
    const currentCount = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, currentCount + 1);

    // Record response time
    this.responseMetrics.push({
      endpoint,
      responseTime,
      timestamp: new Date()
    });

    // Limit metrics history to last 1000 requests
    if (this.responseMetrics.length > 1000) {
      this.responseMetrics = this.responseMetrics.slice(-1000);
    }
  }
}