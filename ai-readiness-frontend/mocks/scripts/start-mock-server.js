#!/usr/bin/env node

// ============================================================================
// Mock Server Startup Script
// ============================================================================
// This script provides a robust way to start the mock server with proper
// configuration, health checks, and graceful shutdown handling.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MockServerLauncher {
  constructor(options = {}) {
    this.options = {
      port: options.port || process.env.SUPABASE_PORT || 54321,
      host: options.host || 'localhost',
      environment: options.environment || process.env.NODE_ENV || 'test',
      autoSeed: options.autoSeed !== false,
      healthCheckRetries: options.healthCheckRetries || 10,
      healthCheckInterval: options.healthCheckInterval || 1000,
      logLevel: options.logLevel || 'info',
      ...options
    };

    this.serverProcess = null;
    this.isShuttingDown = false;
  }

  async start() {
    console.log('🚀 Starting Mock Server...');
    console.log(`📍 Environment: ${this.options.environment}`);
    console.log(`🌐 Server: http://${this.options.host}:${this.options.port}`);
    console.log('');

    try {
      // Check if port is available
      await this.checkPortAvailable();

      // Set environment variables
      this.setEnvironmentVariables();

      // Start the server process
      await this.startServerProcess();

      // Wait for server to be ready
      await this.waitForServer();

      // Seed database if requested
      if (this.options.autoSeed) {
        await this.seedDatabase();
      }

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ Mock Server is ready for testing!');
      console.log('');
      console.log('🔗 Available endpoints:');
      console.log('  📊 Health Check: GET /health');
      console.log('  🔐 Authentication: POST /auth/v1/signup, /auth/v1/token');
      console.log('  💾 Database: GET|POST /rest/v1/:table');
      console.log('  🤖 AI Analysis: POST /api/llm/analyze');
      console.log('  🐛 Debug: GET /api/debug-auth');
      console.log('');

      // Keep process alive
      return new Promise((resolve) => {
        process.on('SIGTERM', () => resolve());
        process.on('SIGINT', () => resolve());
      });

    } catch (error) {
      console.error('❌ Failed to start mock server:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  setEnvironmentVariables() {
    const env = {
      NODE_ENV: this.options.environment,
      SUPABASE_PORT: this.options.port.toString(),
      MOCK_SERVER_HOST: this.options.host,
      LOG_LEVEL: this.options.logLevel,
      JWT_SECRET: process.env.JWT_SECRET || '11sZ5cEsx29QSQitx4k1D05/GvLY3ZWTzubtRFUQYKE=',
      ...process.env
    };

    Object.assign(process.env, env);
  }

  async checkPortAvailable() {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const server = net.createServer();

      server.listen(this.options.port, this.options.host, () => {
        server.once('close', () => resolve());
        server.close();
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.options.port} is already in use`));
        } else {
          reject(err);
        }
      });
    });
  }

  async startServerProcess() {
    return new Promise((resolve, reject) => {
      const serverScript = path.join(__dirname, '../api/enhanced-mock-server.js');
      
      // Check if server script exists
      if (!fs.existsSync(serverScript)) {
        return reject(new Error(`Server script not found: ${serverScript}`));
      }

      this.serverProcess = spawn('node', [serverScript], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: process.env
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server process: ${error.message}`));
      });

      this.serverProcess.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          console.log(`🚨 Server process exited unexpectedly (code: ${code}, signal: ${signal})`);
        }
      });

      // Give the process a moment to start
      setTimeout(() => resolve(), 2000);
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server to be ready...');
    
    for (let i = 0; i < this.options.healthCheckRetries; i++) {
      try {
        const response = await this.healthCheck();
        if (response.status === 'healthy') {
          console.log('✅ Server health check passed');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      if (i < this.options.healthCheckRetries - 1) {
        await this.sleep(this.options.healthCheckInterval);
      }
    }

    throw new Error('Server failed to become ready within the timeout period');
  }

  async healthCheck() {
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: this.options.host,
        port: this.options.port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });
  }

  async seedDatabase() {
    console.log('🌱 Seeding database with test data...');
    
    try {
      const response = await this.makeRequest('POST', '/api/debug/seed', {
        seedProfiles: true,
        seedOrganizations: true,
        seedSurveys: true,
        seedSessions: true
      });

      if (response.success) {
        console.log('✅ Database seeded successfully');
      } else {
        console.warn('⚠️ Database seeding failed:', response.error);
      }
    } catch (error) {
      console.warn('⚠️ Could not seed database:', error.message);
    }
  }

  async makeRequest(method, path, body = null) {
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const postData = body ? JSON.stringify(body) : null;
      
      const req = http.request({
        hostname: this.options.host,
        port: this.options.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      this.isShuttingDown = true;
      
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  async cleanup() {
    if (this.serverProcess && !this.serverProcess.killed) {
      console.log('🛑 Stopping server process...');
      
      // Send SIGTERM first
      this.serverProcess.kill('SIGTERM');
      
      // Wait a bit for graceful shutdown
      await this.sleep(2000);
      
      // Force kill if still running
      if (!this.serverProcess.killed) {
        this.serverProcess.kill('SIGKILL');
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--port':
      case '-p':
        options.port = parseInt(args[++i]);
        break;
      case '--host':
      case '-h':
        options.host = args[++i];
        break;
      case '--env':
      case '-e':
        options.environment = args[++i];
        break;
      case '--no-seed':
        options.autoSeed = false;
        break;
      case '--log-level':
      case '-l':
        options.logLevel = args[++i];
        break;
      case '--help':
        console.log(`
Mock Server Launcher

Usage: node start-mock-server.js [options]

Options:
  -p, --port <port>        Server port (default: 54321)
  -h, --host <host>        Server host (default: localhost)
  -e, --env <environment>  Environment (default: test)
  -l, --log-level <level>  Log level (default: info)
      --no-seed           Skip database seeding
      --help              Show this help message

Examples:
  node start-mock-server.js                    # Start with defaults
  node start-mock-server.js -p 8080            # Custom port
  node start-mock-server.js --env development  # Development mode
  node start-mock-server.js --no-seed          # Skip seeding
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const launcher = new MockServerLauncher(options);
  
  launcher.start().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = MockServerLauncher;