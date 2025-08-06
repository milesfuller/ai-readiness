/**
 * Service Health Monitor
 * Monitors service health, tracks performance metrics, and manages service lifecycle
 */

import { EventEmitter } from 'events';

export interface HealthStatus {
  serviceId: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  message: string;
  timestamp: Date;
  responseTime?: number;
  metadata: Record<string, any>;
}

export interface HealthUpdate {
  serviceId: string;
  previousStatus: string;
  currentStatus: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface ServiceMetrics {
  serviceId: string;
  uptime: number;
  responseTime: {
    average: number;
    min: number;
    max: number;
    percentile95: number;
  };
  errorRate: number;
  requestCount: number;
  lastUpdated: Date;
}

export interface HealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthStatus[];
  summary: {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    degradedServices: number;
  };
  recommendations: string[];
}

export interface HealthThresholds {
  responseTimeWarning: number;
  responseTimeCritical: number;
  errorRateWarning: number;
  errorRateCritical: number;
  uptimeWarning: number;
}

export interface HealthAlert {
  serviceId: string;
  alertType: 'response_time' | 'error_rate' | 'service_down' | 'service_degraded';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  type: 'database' | 'api' | 'web' | 'mock' | 'cache' | 'auth';
  endpoints: {
    health: string;
    primary: string;
  };
  expectedResponseTime: number;
  checkInterval: number;
  timeout: number;
  retries: number;
  dependencies: string[];
}

export class ServiceHealthMonitor extends EventEmitter {
  private services: Map<string, ServiceDefinition> = new Map();
  private healthStatus: Map<string, HealthStatus> = new Map();
  private metrics: Map<string, ServiceMetrics> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private thresholds: HealthThresholds;
  private isMonitoring: boolean = false;

  constructor(thresholds?: Partial<HealthThresholds>) {
    super();
    
    this.thresholds = {
      responseTimeWarning: 1000, // 1 second
      responseTimeCritical: 5000, // 5 seconds
      errorRateWarning: 0.05, // 5%
      errorRateCritical: 0.1, // 10%
      uptimeWarning: 0.95, // 95%
      ...thresholds
    };

    this.initializeDefaultServices();
  }

  /**
   * Register a service for health monitoring
   */
  registerService(service: ServiceDefinition): void {
    console.log(`📋 Registering service for monitoring: ${service.name}`);
    
    this.services.set(service.id, service);
    
    // Initialize metrics
    this.metrics.set(service.id, {
      serviceId: service.id,
      uptime: 0,
      responseTime: {
        average: 0,
        min: 0,
        max: 0,
        percentile95: 0
      },
      errorRate: 0,
      requestCount: 0,
      lastUpdated: new Date()
    });

    // Start monitoring if already running
    if (this.isMonitoring) {
      this.startServiceMonitoring(service.id);
    }

    this.emit('service:registered', service);
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceId: string): Promise<HealthStatus> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not registered`);
    }

    const startTime = Date.now();
    let status: HealthStatus;

    try {
      // Check health endpoint
      const healthCheck = await this.performHealthCheck(service);
      const responseTime = Date.now() - startTime;

      status = {
        serviceId,
        status: healthCheck.healthy ? 'healthy' : 'unhealthy',
        message: healthCheck.message,
        timestamp: new Date(),
        responseTime,
        metadata: {
          endpoint: service.endpoints.health,
          ...healthCheck.metadata
        }
      };

      // Update metrics
      this.updateServiceMetrics(serviceId, responseTime, healthCheck.healthy);

      // Check for degraded performance
      if (healthCheck.healthy && responseTime > this.thresholds.responseTimeWarning) {
        status.status = 'degraded';
        status.message = `Service responding slowly: ${responseTime}ms`;
      }

    } catch (error) {
      status = {
        serviceId,
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };

      this.updateServiceMetrics(serviceId, Date.now() - startTime, false);
    }

    // Store status
    const previousStatus = this.healthStatus.get(serviceId);
    this.healthStatus.set(serviceId, status);

    // Emit events for status changes
    if (previousStatus && previousStatus.status !== status.status) {
      this.emit('service:status_changed', {
        serviceId,
        previousStatus: previousStatus.status,
        currentStatus: status.status,
        timestamp: new Date(),
        details: { previousStatus, currentStatus: status }
      });

      if (status.status === 'unhealthy') {
        this.emit('service:unhealthy', serviceId, status);
      } else if (status.status === 'healthy' && previousStatus.status !== 'healthy') {
        this.emit('service:recovered', serviceId, status);
      }
    }

    // Check for alerts
    await this.checkAlertConditions(serviceId, status);

    return status;
  }

  /**
   * Start continuous monitoring of all registered services
   */
  async *monitorContinuousHealth(): AsyncIterator<HealthUpdate> {
    console.log('🔄 Starting continuous health monitoring...');
    
    this.isMonitoring = true;

    // Start monitoring for all services
    for (const serviceId of this.services.keys()) {
      this.startServiceMonitoring(serviceId);
    }

    // Create async iterator for health updates
    let updateQueue: HealthUpdate[] = [];
    let resolveNext: ((value: IteratorResult<HealthUpdate>) => void) | null = null;

    const statusChangeListener = (update: HealthUpdate) => {
      if (resolveNext) {
        resolveNext({ value: update, done: false });
        resolveNext = null;
      } else {
        updateQueue.push(update);
      }
    };

    this.on('service:status_changed', statusChangeListener);

    try {
      while (this.isMonitoring) {
        if (updateQueue.length > 0) {
          yield updateQueue.shift()!;
        } else {
          // Wait for next update
          await new Promise<void>((resolve) => {
            resolveNext = (result) => {
              if (!result.done) {
                resolve();
              }
            };
          });
        }
      }
    } finally {
      this.off('service:status_changed', statusChangeListener);
      this.stopAllMonitoring();
    }
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    console.log('🛑 Stopping health monitoring...');
    
    this.isMonitoring = false;
    this.stopAllMonitoring();
    
    this.emit('monitoring:stopped');
  }

  /**
   * Track service metrics
   */
  async trackServiceMetrics(serviceId: string): Promise<ServiceMetrics> {
    const metrics = this.metrics.get(serviceId);
    if (!metrics) {
      throw new Error(`No metrics found for service: ${serviceId}`);
    }

    return { ...metrics };
  }

  /**
   * Generate comprehensive health report
   */
  async generateHealthReport(): Promise<HealthReport> {
    console.log('📊 Generating health report...');

    const services = Array.from(this.healthStatus.values());
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    const overallStatus = unhealthyServices > 0 ? 'unhealthy' :
                         degradedServices > 0 ? 'degraded' : 'healthy';

    const recommendations = this.generateRecommendations(services);

    const report: HealthReport = {
      timestamp: new Date(),
      overallStatus,
      services,
      summary: {
        totalServices: services.length,
        healthyServices,
        unhealthyServices,
        degradedServices
      },
      recommendations
    };

    this.emit('report:generated', report);
    return report;
  }

  /**
   * Configure health alert thresholds
   */
  configureHealthAlerts(thresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('⚙️ Health alert thresholds updated:', this.thresholds);
    this.emit('thresholds:updated', this.thresholds);
  }

  /**
   * Handle health alerts
   */
  async handleHealthAlerts(alert: HealthAlert): Promise<void> {
    console.log(`🚨 Health alert: ${alert.alertType} for service ${alert.serviceId}`);
    
    // Log the alert
    console.log(`Alert Details:`, {
      service: alert.serviceId,
      type: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp
    });

    // Emit alert event
    this.emit('alert:triggered', alert);

    // Handle specific alert types
    switch (alert.alertType) {
      case 'service_down':
        await this.handleServiceDownAlert(alert);
        break;
      case 'response_time':
        await this.handleResponseTimeAlert(alert);
        break;
      case 'error_rate':
        await this.handleErrorRateAlert(alert);
        break;
      case 'service_degraded':
        await this.handleServiceDegradedAlert(alert);
        break;
    }
  }

  /**
   * Get all current service statuses
   */
  getAllServiceStatuses(): HealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get metrics for all services
   */
  getAllServiceMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Private helper methods

  private initializeDefaultServices(): void {
    const defaultServices: ServiceDefinition[] = [
      {
        id: 'supabase-db',
        name: 'Supabase Database',
        type: 'database',
        endpoints: {
          health: 'http://localhost:54322/health',
          primary: 'http://localhost:54322'
        },
        expectedResponseTime: 100,
        checkInterval: 10000,
        timeout: 5000,
        retries: 3,
        dependencies: []
      },
      {
        id: 'supabase-api',
        name: 'Supabase API',
        type: 'api',
        endpoints: {
          health: 'http://localhost:54321/health',
          primary: 'http://localhost:54321'
        },
        expectedResponseTime: 200,
        checkInterval: 5000,
        timeout: 10000,
        retries: 2,
        dependencies: ['supabase-db']
      },
      {
        id: 'supabase-auth',
        name: 'Supabase Auth',
        type: 'auth',
        endpoints: {
          health: 'http://localhost:54325/health',
          primary: 'http://localhost:54325'
        },
        expectedResponseTime: 300,
        checkInterval: 10000,
        timeout: 8000,
        retries: 2,
        dependencies: ['supabase-db']
      },
      {
        id: 'mock-server',
        name: 'Mock Server',
        type: 'mock',
        endpoints: {
          health: 'http://localhost:3001/mockserver/status',
          primary: 'http://localhost:3001'
        },
        expectedResponseTime: 50,
        checkInterval: 15000,
        timeout: 3000,
        retries: 1,
        dependencies: []
      },
      {
        id: 'redis',
        name: 'Redis Cache',
        type: 'cache',
        endpoints: {
          health: 'http://localhost:6379/ping',
          primary: 'http://localhost:6379'
        },
        expectedResponseTime: 10,
        checkInterval: 30000,
        timeout: 2000,
        retries: 2,
        dependencies: []
      },
      {
        id: 'next-app',
        name: 'Next.js Application',
        type: 'web',
        endpoints: {
          health: 'http://localhost:3000/api/health',
          primary: 'http://localhost:3000'
        },
        expectedResponseTime: 500,
        checkInterval: 5000,
        timeout: 15000,
        retries: 3,
        dependencies: ['supabase-api', 'supabase-auth', 'redis']
      }
    ];

    defaultServices.forEach(service => this.registerService(service));
  }

  private async performHealthCheck(service: ServiceDefinition): Promise<{
    healthy: boolean;
    message: string;
    metadata: Record<string, any>;
  }> {
    try {
      // Try health endpoint first
      let response = await this.fetchWithTimeout(service.endpoints.health, {
        timeout: service.timeout,
        retries: service.retries
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          healthy: true,
          message: 'Health check passed',
          metadata: {
            status: response.status,
            data
          }
        };
      }

      // Fallback to primary endpoint
      response = await this.fetchWithTimeout(service.endpoints.primary, {
        timeout: service.timeout,
        retries: 1
      });

      return {
        healthy: response.ok,
        message: response.ok ? 'Primary endpoint accessible' : `HTTP ${response.status}`,
        metadata: {
          status: response.status,
          fallback: true
        }
      };

    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : String(error),
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async fetchWithTimeout(
    url: string, 
    options: { timeout: number; retries: number }
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i <= options.retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Test-Infrastructure-Health-Monitor',
            'Accept': 'application/json',
          }
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        lastError = error as Error;
        if (i < options.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }

    throw lastError!;
  }

  private updateServiceMetrics(serviceId: string, responseTime: number, success: boolean): void {
    const metrics = this.metrics.get(serviceId);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.lastUpdated = new Date();

    // Update response time metrics
    if (metrics.responseTime.min === 0 || responseTime < metrics.responseTime.min) {
      metrics.responseTime.min = responseTime;
    }
    if (responseTime > metrics.responseTime.max) {
      metrics.responseTime.max = responseTime;
    }

    // Calculate running average
    metrics.responseTime.average = (
      (metrics.responseTime.average * (metrics.requestCount - 1) + responseTime) / 
      metrics.requestCount
    );

    // Update error rate
    const currentErrorRate = metrics.errorRate;
    const errorCount = Math.round(currentErrorRate * (metrics.requestCount - 1));
    const newErrorCount = success ? errorCount : errorCount + 1;
    metrics.errorRate = newErrorCount / metrics.requestCount;

    this.metrics.set(serviceId, metrics);
  }

  private startServiceMonitoring(serviceId: string): void {
    const service = this.services.get(serviceId);
    if (!service) return;

    // Clear existing interval
    const existingInterval = this.monitoringIntervals.get(serviceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new monitoring interval
    const interval = setInterval(async () => {
      try {
        await this.checkServiceHealth(serviceId);
      } catch (error) {
        console.error(`Health check failed for ${serviceId}:`, error);
      }
    }, service.checkInterval);

    this.monitoringIntervals.set(serviceId, interval);
  }

  private stopAllMonitoring(): void {
    this.monitoringIntervals.forEach((interval, serviceId) => {
      clearInterval(interval);
      console.log(`🛑 Stopped monitoring for service: ${serviceId}`);
    });
    this.monitoringIntervals.clear();
  }

  private async checkAlertConditions(serviceId: string, status: HealthStatus): Promise<void> {
    const metrics = this.metrics.get(serviceId);
    if (!metrics) return;

    const alerts: HealthAlert[] = [];

    // Check response time alerts
    if (status.responseTime && status.responseTime > this.thresholds.responseTimeCritical) {
      alerts.push({
        serviceId,
        alertType: 'response_time',
        severity: 'critical',
        message: `Response time ${status.responseTime}ms exceeds critical threshold ${this.thresholds.responseTimeCritical}ms`,
        timestamp: new Date(),
        metadata: { responseTime: status.responseTime, threshold: this.thresholds.responseTimeCritical }
      });
    } else if (status.responseTime && status.responseTime > this.thresholds.responseTimeWarning) {
      alerts.push({
        serviceId,
        alertType: 'response_time',
        severity: 'warning',
        message: `Response time ${status.responseTime}ms exceeds warning threshold ${this.thresholds.responseTimeWarning}ms`,
        timestamp: new Date(),
        metadata: { responseTime: status.responseTime, threshold: this.thresholds.responseTimeWarning }
      });
    }

    // Check error rate alerts
    if (metrics.errorRate > this.thresholds.errorRateCritical) {
      alerts.push({
        serviceId,
        alertType: 'error_rate',
        severity: 'critical',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds critical threshold ${(this.thresholds.errorRateCritical * 100).toFixed(2)}%`,
        timestamp: new Date(),
        metadata: { errorRate: metrics.errorRate, threshold: this.thresholds.errorRateCritical }
      });
    } else if (metrics.errorRate > this.thresholds.errorRateWarning) {
      alerts.push({
        serviceId,
        alertType: 'error_rate',
        severity: 'warning',
        message: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds warning threshold ${(this.thresholds.errorRateWarning * 100).toFixed(2)}%`,
        timestamp: new Date(),
        metadata: { errorRate: metrics.errorRate, threshold: this.thresholds.errorRateWarning }
      });
    }

    // Check service status alerts
    if (status.status === 'unhealthy') {
      alerts.push({
        serviceId,
        alertType: 'service_down',
        severity: 'critical',
        message: `Service is unhealthy: ${status.message}`,
        timestamp: new Date(),
        metadata: { status: status.status, message: status.message }
      });
    } else if (status.status === 'degraded') {
      alerts.push({
        serviceId,
        alertType: 'service_degraded',
        severity: 'warning',
        message: `Service performance is degraded: ${status.message}`,
        timestamp: new Date(),
        metadata: { status: status.status, message: status.message }
      });
    }

    // Handle all alerts
    for (const alert of alerts) {
      await this.handleHealthAlerts(alert);
    }
  }

  private generateRecommendations(services: HealthStatus[]): string[] {
    const recommendations: string[] = [];

    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');

    if (unhealthyServices.length > 0) {
      recommendations.push(`Immediate attention required: ${unhealthyServices.length} services are unhealthy`);
      recommendations.push(`Restart or investigate: ${unhealthyServices.map(s => s.serviceId).join(', ')}`);
    }

    if (degradedServices.length > 0) {
      recommendations.push(`Performance monitoring needed: ${degradedServices.length} services are degraded`);
      recommendations.push(`Check resource utilization for: ${degradedServices.map(s => s.serviceId).join(', ')}`);
    }

    if (services.length === 0) {
      recommendations.push('No services are being monitored - ensure services are registered');
    }

    if (recommendations.length === 0) {
      recommendations.push('All services are healthy - continue monitoring');
    }

    return recommendations;
  }

  private async handleServiceDownAlert(alert: HealthAlert): Promise<void> {
    console.log(`🚨 Service down alert for ${alert.serviceId}`);
    // Could implement automatic restart logic here
  }

  private async handleResponseTimeAlert(alert: HealthAlert): Promise<void> {
    console.log(`🐌 Response time alert for ${alert.serviceId}`);
    // Could implement performance analysis here
  }

  private async handleErrorRateAlert(alert: HealthAlert): Promise<void> {
    console.log(`💥 Error rate alert for ${alert.serviceId}`);
    // Could implement error analysis here
  }

  private async handleServiceDegradedAlert(alert: HealthAlert): Promise<void> {
    console.log(`⚠️ Service degraded alert for ${alert.serviceId}`);
    // Could implement performance optimization here
  }
}