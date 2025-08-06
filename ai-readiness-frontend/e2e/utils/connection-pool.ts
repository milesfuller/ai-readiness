/**
 * Connection Pool Manager for EPIPE Prevention
 * 
 * This utility manages browser connections to prevent EPIPE errors
 * by limiting concurrent connections and implementing proper cleanup.
 */

import { EventEmitter } from 'events';

export interface ConnectionPoolOptions {
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  idleTimeout: number;
  enableMetrics: boolean;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  failedConnections: number;
  retriedConnections: number;
  avgConnectionTime: number;
  epipeErrors: number;
}

export interface PoolConnection {
  id: string;
  created: number;
  lastUsed: number;
  isActive: boolean;
  retryCount: number;
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, PoolConnection> = new Map();
  private activeCount = 0;
  private waitingQueue: Array<{
    resolve: (connection: PoolConnection) => void;
    reject: (error: Error) => void;
    priority: number;
  }> = [];
  
  private metrics: ConnectionMetrics = {
    activeConnections: 0,
    totalConnections: 0,
    failedConnections: 0,
    retriedConnections: 0,
    avgConnectionTime: 0,
    epipeErrors: 0
  };

  private cleanupInterval?: NodeJS.Timeout;
  private connectionTimes: number[] = [];

  constructor(private options: ConnectionPoolOptions) {
    super();
    this.startCleanupRoutine();
    this.setupProcessHandlers();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(priority: number = 0): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      // Check if we can create a new connection immediately
      if (this.activeCount < this.options.maxConcurrent) {
        const connection = this.createConnection();
        resolve(connection);
        return;
      }

      // Add to waiting queue with priority
      this.waitingQueue.push({ resolve, reject, priority });
      this.waitingQueue.sort((a, b) => b.priority - a.priority);

      // Set timeout for waiting requests
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          reject(new Error('Connection pool timeout'));
        }
      }, this.options.connectionTimeout);
    });
  }

  /**
   * Release a connection back to the pool
   */
  async release(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.lastUsed = Date.now();
    connection.isActive = false;
    this.activeCount--;
    this.metrics.activeConnections = this.activeCount;

    // Process waiting queue
    const waiting = this.waitingQueue.shift();
    if (waiting) {
      connection.isActive = true;
      this.activeCount++;
      this.metrics.activeConnections = this.activeCount;
      waiting.resolve(connection);
    }

    this.emit('connectionReleased', { connectionId, activeCount: this.activeCount });
  }

  /**
   * Create a new connection
   */
  private createConnection(): PoolConnection {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const connection: PoolConnection = {
      id: connectionId,
      created: now,
      lastUsed: now,
      isActive: true,
      retryCount: 0
    };

    this.connections.set(connectionId, connection);
    this.activeCount++;
    this.metrics.activeConnections = this.activeCount;
    this.metrics.totalConnections++;

    this.emit('connectionCreated', { connectionId, activeCount: this.activeCount });
    
    return connection;
  }

  /**
   * Retry a failed connection with exponential backoff
   */
  async retryConnection(connectionId: string, error: Error): Promise<PoolConnection> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Check if error is EPIPE related
    if (this.isEpipeError(error)) {
      this.metrics.epipeErrors++;
      this.emit('epipeError', { connectionId, error: error.message });
    }

    if (connection.retryCount >= this.options.maxRetries) {
      this.metrics.failedConnections++;
      await this.destroyConnection(connectionId);
      throw new Error(`Max retries exceeded for connection ${connectionId}`);
    }

    connection.retryCount++;
    this.metrics.retriedConnections++;

    // Exponential backoff delay
    const delay = this.options.retryDelay * Math.pow(2, connection.retryCount - 1);
    await this.sleep(delay);

    this.emit('connectionRetry', { 
      connectionId, 
      retryCount: connection.retryCount, 
      delay 
    });

    return connection;
  }

  /**
   * Check if error is EPIPE related
   */
  private isEpipeError(error: Error): boolean {
    const epipePatterns = [
      /EPIPE/i,
      /broken pipe/i,
      /connection reset/i,
      /socket hang up/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i
    ];

    return epipePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Destroy a connection and clean up resources
   */
  async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    if (connection.isActive) {
      this.activeCount--;
      this.metrics.activeConnections = this.activeCount;
    }

    this.connections.delete(connectionId);
    this.emit('connectionDestroyed', { connectionId, activeCount: this.activeCount });

    // Process waiting queue if needed
    if (this.waitingQueue.length > 0 && this.activeCount < this.options.maxConcurrent) {
      const waiting = this.waitingQueue.shift();
      if (waiting) {
        try {
          const newConnection = this.createConnection();
          waiting.resolve(newConnection);
        } catch (error) {
          waiting.reject(error as Error);
        }
      }
    }
  }

  /**
   * Start cleanup routine for idle connections
   */
  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDestroy: string[] = [];

      for (const [connectionId, connection] of this.connections) {
        if (!connection.isActive && 
            (now - connection.lastUsed) > this.options.idleTimeout) {
          toDestroy.push(connectionId);
        }
      }

      // Destroy idle connections
      toDestroy.forEach(connectionId => {
        this.destroyConnection(connectionId);
      });

      if (toDestroy.length > 0) {
        this.emit('idleCleanup', { destroyed: toDestroy.length });
      }
    }, this.options.idleTimeout / 2);
  }

  /**
   * Setup process handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    const cleanup = async () => {
      await this.shutdown();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception in connection pool:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection in connection pool:', reason);
      cleanup();
    });
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): ConnectionMetrics {
    // Calculate average connection time
    if (this.connectionTimes.length > 0) {
      this.metrics.avgConnectionTime = 
        this.connectionTimes.reduce((sum, time) => sum + time, 0) / this.connectionTimes.length;
    }

    return { ...this.metrics };
  }

  /**
   * Get pool status
   */
  getStatus(): {
    activeConnections: number;
    totalConnections: number;
    waitingRequests: number;
    maxConcurrent: number;
    healthScore: number;
  } {
    const metrics = this.getMetrics();
    const healthScore = Math.max(0, 100 - (
      (metrics.failedConnections / Math.max(metrics.totalConnections, 1)) * 50 +
      (metrics.epipeErrors / Math.max(metrics.totalConnections, 1)) * 30 +
      (this.waitingQueue.length / this.options.maxConcurrent) * 20
    ));

    return {
      activeConnections: this.activeCount,
      totalConnections: this.connections.size,
      waitingRequests: this.waitingQueue.length,
      maxConcurrent: this.options.maxConcurrent,
      healthScore: Math.round(healthScore)
    };
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all waiting requests
    this.waitingQueue.forEach(item => {
      item.reject(new Error('Connection pool shutting down'));
    });
    this.waitingQueue = [];

    // Destroy all connections
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(
      connectionIds.map(id => this.destroyConnection(id))
    );

    this.emit('shutdown');
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default connection pool instance
 */
export const defaultConnectionPool = new ConnectionPool({
  maxConcurrent: 4, // Conservative limit to prevent EPIPE
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 30000,
  idleTimeout: 60000,
  enableMetrics: true
});

/**
 * Create a connection pool with custom options
 */
export function createConnectionPool(options: Partial<ConnectionPoolOptions>): ConnectionPool {
  const defaultOptions: ConnectionPoolOptions = {
    maxConcurrent: 4,
    maxRetries: 3,
    retryDelay: 1000,
    connectionTimeout: 30000,
    idleTimeout: 60000,
    enableMetrics: true
  };

  return new ConnectionPool({ ...defaultOptions, ...options });
}