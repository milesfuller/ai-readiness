/**
 * Database Connection Pool for E2E Tests
 * 
 * Manages database connections during test execution to prevent
 * connection leaks and EPIPE errors in database operations.
 */

import { EventEmitter } from 'events';

export interface DatabasePoolConfig {
  connectionString: string;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface DatabaseConnection {
  id: string;
  created: number;
  lastUsed: number;
  isActive: boolean;
  query: (sql: string, params?: any[]) => Promise<any>;
  release: () => Promise<void>;
}

export class DatabasePool extends EventEmitter {
  private connections: Map<string, DatabaseConnection> = new Map();
  private activeConnections = 0;
  private waitingQueue: Array<{
    resolve: (connection: DatabaseConnection) => void;
    reject: (error: Error) => void;
  }> = [];

  private config: DatabasePoolConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: DatabasePoolConfig) {
    super();
    this.config = config;
    this.startCleanupRoutine();
    this.setupGracefulShutdown();
  }

  /**
   * Acquire a database connection from the pool
   */
  async acquire(): Promise<DatabaseConnection> {
    return new Promise((resolve, reject) => {
      // Check if we can create a new connection
      if (this.activeConnections < this.config.maxConnections) {
        this.createConnection()
          .then(resolve)
          .catch(reject);
        return;
      }

      // Add to waiting queue
      this.waitingQueue.push({ resolve, reject });

      // Set timeout for waiting requests
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          reject(new Error('Database connection timeout'));
        }
      }, this.config.connectionTimeout);
    });
  }

  /**
   * Create a new database connection
   */
  private async createConnection(): Promise<DatabaseConnection> {
    const connectionId = `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Mock database connection for testing
      // In a real implementation, this would create an actual database connection
      const mockConnection: DatabaseConnection = {
        id: connectionId,
        created: Date.now(),
        lastUsed: Date.now(),
        isActive: true,
        
        query: async (sql: string, params?: any[]) => {
          // Mock query implementation
          // In real usage, this would execute actual SQL queries
          this.updateLastUsed(connectionId);
          
          // Simulate query delay
          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50));
          
          // Return mock result based on query type
          if (sql.toLowerCase().includes('select')) {
            return { rows: [], rowCount: 0 };
          } else {
            return { rowsAffected: 1 };
          }
        },
        
        release: async () => {
          await this.releaseConnection(connectionId);
        }
      };

      this.connections.set(connectionId, mockConnection);
      this.activeConnections++;

      this.emit('connectionCreated', { 
        connectionId, 
        activeCount: this.activeConnections 
      });

      return mockConnection;

    } catch (error) {
      this.emit('connectionError', { 
        connectionId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  private async releaseConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.isActive = false;
    connection.lastUsed = Date.now();
    this.activeConnections--;

    // Process waiting queue
    const waiting = this.waitingQueue.shift();
    if (waiting) {
      connection.isActive = true;
      this.activeConnections++;
      waiting.resolve(connection);
    }

    this.emit('connectionReleased', { 
      connectionId, 
      activeCount: this.activeConnections 
    });
  }

  /**
   * Update last used timestamp for a connection
   */
  private updateLastUsed(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastUsed = Date.now();
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const connection = await this.acquire();
    try {
      const result = await connection.query(sql, params);
      return result;
    } finally {
      await connection.release();
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
            (now - connection.lastUsed) > this.config.idleTimeout) {
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
    }, this.config.idleTimeout / 2);
  }

  /**
   * Destroy a connection
   */
  private async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    if (connection.isActive) {
      this.activeConnections--;
    }

    this.connections.delete(connectionId);

    this.emit('connectionDestroyed', { 
      connectionId, 
      activeCount: this.activeConnections 
    });

    // Process waiting queue if needed
    if (this.waitingQueue.length > 0 && 
        this.activeConnections < this.config.maxConnections) {
      const waiting = this.waitingQueue.shift();
      if (waiting) {
        try {
          const newConnection = await this.createConnection();
          waiting.resolve(newConnection);
        } catch (error) {
          waiting.reject(error as Error);
        }
      }
    }
  }

  /**
   * Get pool status
   */
  getStatus(): {
    activeConnections: number;
    totalConnections: number;
    waitingRequests: number;
    maxConnections: number;
  } {
    return {
      activeConnections: this.activeConnections,
      totalConnections: this.connections.size,
      waitingRequests: this.waitingQueue.length,
      maxConnections: this.config.maxConnections
    };
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      await this.shutdown();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  /**
   * Shutdown the pool gracefully
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all waiting requests
    this.waitingQueue.forEach(item => {
      item.reject(new Error('Database pool shutting down'));
    });
    this.waitingQueue = [];

    // Close all connections
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(
      connectionIds.map(id => this.destroyConnection(id))
    );

    this.emit('shutdown');
  }
}

/**
 * Default database pool configuration
 */
const defaultConfig: DatabasePoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:test_postgres_password@localhost:54322/ai_readiness_test',
  maxConnections: 3, // Conservative limit for tests
  connectionTimeout: 30000,
  idleTimeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * Default database pool instance
 */
export const testDatabasePool = new DatabasePool(defaultConfig);

/**
 * Helper function to create a test database pool
 */
export function createTestDatabasePool(config?: Partial<DatabasePoolConfig>): DatabasePool {
  const fullConfig = { ...defaultConfig, ...config };
  return new DatabasePool(fullConfig);
}

/**
 * Test utility functions
 */
export const testDbUtils = {
  /**
   * Setup test database
   */
  async setup(): Promise<void> {
    // Create test tables and seed data
    await testDatabasePool.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await testDatabasePool.query(`
      INSERT INTO test_users (email, password_hash) 
      VALUES 
        ('testuser@example.com', '$2b$10$hash1'),
        ('testadmin@example.com', '$2b$10$hash2')
      ON CONFLICT (email) DO NOTHING;
    `);
  },

  /**
   * Cleanup test database
   */
  async cleanup(): Promise<void> {
    await testDatabasePool.query('DROP TABLE IF EXISTS test_users CASCADE;');
  },

  /**
   * Reset test data
   */
  async reset(): Promise<void> {
    await this.cleanup();
    await this.setup();
  }
};