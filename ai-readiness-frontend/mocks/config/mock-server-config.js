// ============================================================================
// Mock Server Configuration
// ============================================================================
// Centralized configuration for all mock server components including
// authentication, database, API endpoints, and testing scenarios.

const path = require('path');

class MockServerConfig {
  constructor(environment = 'test') {
    this.environment = environment;
    this.loadConfiguration();
  }

  loadConfiguration() {
    // Base configuration
    this.config = {
      // Server settings
      server: {
        host: process.env.MOCK_SERVER_HOST || 'localhost',
        port: parseInt(process.env.SUPABASE_PORT || process.env.MOCK_SERVER_PORT || '54321'),
        protocol: 'http',
        cors: {
          origin: true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: [
            'Content-Type', 
            'Authorization', 
            'apikey', 
            'x-client-info',
            'prefer',
            'range',
            'x-supabase-auth',
            'x-api-key'
          ]
        }
      },

      // Authentication configuration
      auth: {
        jwtSecret: process.env.JWT_SECRET || '11sZ5cEsx29QSQitx4k1D05/GvLY3ZWTzubtRFUQYKE=',
        tokenExpiry: 3600, // 1 hour
        refreshTokenExpiry: 86400, // 24 hours
        verificationTokenExpiry: 86400, // 24 hours
        resetTokenExpiry: 3600, // 1 hour
        allowedDomains: ['localhost', '127.0.0.1', 'test.example.com'],
        
        // Password requirements
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          forbiddenPasswords: ['password', '12345678', 'admin123']
        },

        // Session management
        session: {
          cookieName: 'supabase-auth-token',
          cookieOptions: {
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
          }
        }
      },

      // Database configuration
      database: {
        // Table definitions and constraints
        tables: {
          profiles: {
            primaryKey: 'id',
            foreignKeys: {
              user_id: 'auth.users.id'
            },
            uniqueConstraints: ['user_id'],
            indexes: ['user_id', 'role', 'organization_name']
          },
          organizations: {
            primaryKey: 'id',
            foreignKeys: {
              created_by: 'profiles.user_id'
            },
            uniqueConstraints: ['name'],
            indexes: ['name', 'created_by', 'industry']
          },
          surveys: {
            primaryKey: 'id',
            foreignKeys: {
              organization_id: 'organizations.id',
              created_by: 'profiles.user_id'
            },
            indexes: ['status', 'organization_id', 'created_by']
          },
          survey_sessions: {
            primaryKey: 'id',
            foreignKeys: {
              survey_id: 'surveys.id',
              user_id: 'profiles.user_id'
            },
            indexes: ['survey_id', 'user_id', 'status']
          }
        },

        // Auto-cleanup settings
        cleanup: {
          enableAutoCleanup: true,
          cleanupInterval: 5 * 60 * 1000, // 5 minutes
          expiredTokenCleanup: true,
          oldSessionCleanup: true,
          auditLogRetention: 30 * 24 * 60 * 60 * 1000 // 30 days
        }
      },

      // API configuration
      api: {
        // Rate limiting
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // requests per window
          authEndpoints: {
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 50 // authentication attempts per window
          },
          perUser: {
            windowMs: 15 * 60 * 1000,
            max: 200 // per authenticated user
          }
        },

        // Request/Response settings
        request: {
          maxBodySize: '10mb',
          timeout: 30000, // 30 seconds
          keepAlive: true
        },

        // Response formatting
        response: {
          enableEtag: true,
          enableCompression: true,
          defaultPageSize: 50,
          maxPageSize: 1000
        }
      },

      // Mock AI/LLM services
      ai: {
        // Analysis settings
        analysis: {
          processingDelay: {
            min: 1000, // 1 second minimum
            max: 5000  // 5 seconds maximum
          },
          confidenceScore: {
            min: 0.7,
            max: 0.95
          },
          models: {
            'gpt-4-analysis-v1': {
              name: 'GPT-4 Analysis Model',
              version: '1.0',
              capabilities: ['readiness_score', 'recommendations', 'insights']
            },
            'gpt-4-quick-v1': {
              name: 'GPT-4 Quick Assessment',
              version: '1.0',
              capabilities: ['quick_assessment', 'basic_insights']
            }
          }
        },

        // Response templates
        templates: {
          readinessScore: {
            categories: [
              'strategy', 'data', 'technology', 'talent', 
              'governance', 'investment', 'timeline'
            ],
            scoreRanges: {
              excellent: [90, 100],
              good: [70, 89],
              fair: [50, 69],
              poor: [0, 49]
            }
          }
        }
      },

      // Logging and monitoring
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableRequestLogging: true,
        enableErrorLogging: true,
        enableAuthLogging: true,
        logFile: process.env.MOCK_SERVER_LOG_FILE || 'mock-server.log',
        maxLogSize: 10 * 1024 * 1024, // 10MB
        maxLogFiles: 5
      },

      // Test scenarios and fixtures
      testing: {
        // Enable test routes
        enableTestRoutes: process.env.NODE_ENV === 'test',
        
        // Data seeding
        autoSeedData: true,
        seedData: {
          users: true,
          organizations: true,
          surveys: true,
          sessions: true
        },

        // Test scenarios
        scenarios: {
          // Successful authentication flow
          happyPath: {
            enabled: true,
            description: 'Standard user registration and login flow'
          },
          
          // Failed authentication scenarios
          authFailures: {
            enabled: true,
            description: 'Various authentication failure scenarios'
          },
          
          // Data corruption scenarios
          dataCorruption: {
            enabled: false,
            description: 'Simulate data integrity issues'
          },
          
          // Performance testing
          performanceTest: {
            enabled: true,
            description: 'High load and performance scenarios'
          }
        }
      },

      // Security settings
      security: {
        // HTTPS settings (for production-like testing)
        https: {
          enabled: false,
          keyFile: null,
          certFile: null
        },

        // Security headers
        headers: {
          enableHSTS: false, // Not needed for testing
          enableCSP: true,
          enableXSSProtection: true,
          enableFrameOptions: true,
          enableContentTypeOptions: true
        },

        // API security
        apiSecurity: {
          requireApiKey: false, // Optional for testing
          validApiKeys: [
            'test-anon-key',
            'test-service-role-key'
          ],
          enableCsrfProtection: false // Disabled for API testing
        }
      },

      // Error handling
      errorHandling: {
        // Include stack traces in development
        includeStackTrace: this.environment !== 'production',
        
        // Custom error messages
        messages: {
          unauthorized: 'Authentication required to access this resource',
          forbidden: 'Insufficient permissions to access this resource',
          notFound: 'The requested resource was not found',
          rateLimit: 'Too many requests. Please try again later.',
          serverError: 'An internal server error occurred'
        }
      },

      // Feature flags
      features: {
        // Enable/disable specific features for testing
        enableEmailVerification: true,
        enablePasswordReset: true,
        enableRememberMe: true,
        enableSessionManagement: true,
        enableAuditLogging: true,
        enableAnalytics: false, // Disabled for testing
        enableRealTimeUpdates: false, // Not implemented in mock
        enableFileUploads: false // Not implemented in mock
      }
    };

    // Environment-specific overrides
    this.applyEnvironmentOverrides();
  }

  applyEnvironmentOverrides() {
    switch (this.environment) {
      case 'development':
        this.config.logging.level = 'debug';
        this.config.auth.session.cookieOptions.secure = false;
        this.config.errorHandling.includeStackTrace = true;
        break;

      case 'test':
        this.config.server.port = parseInt(process.env.TEST_PORT || '54322');
        this.config.database.cleanup.enableAutoCleanup = false;
        this.config.logging.level = 'warn';
        this.config.api.rateLimit.max = 10000; // Higher limits for testing
        break;

      case 'ci':
        this.config.server.host = '0.0.0.0'; // Allow external connections in CI
        this.config.logging.enableRequestLogging = false;
        this.config.testing.autoSeedData = true;
        break;

      case 'production':
        this.config.auth.session.cookieOptions.secure = true;
        this.config.security.https.enabled = true;
        this.config.errorHandling.includeStackTrace = false;
        this.config.testing.enableTestRoutes = false;
        break;
    }
  }

  // Get full server URL
  getServerUrl() {
    const { protocol, host, port } = this.config.server;
    return `${protocol}://${host}:${port}`;
  }

  // Get database connection string (mock)
  getDatabaseUrl() {
    return `mock-db://${this.config.server.host}:${this.config.server.port}/test`;
  }

  // Get authentication configuration
  getAuthConfig() {
    return this.config.auth;
  }

  // Get API configuration
  getApiConfig() {
    return this.config.api;
  }

  // Get logging configuration
  getLoggingConfig() {
    return this.config.logging;
  }

  // Get test configuration
  getTestConfig() {
    return this.config.testing;
  }

  // Validate configuration
  validate() {
    const errors = [];

    // Validate required settings
    if (!this.config.auth.jwtSecret) {
      errors.push('JWT secret is required');
    }

    if (this.config.server.port < 1024 || this.config.server.port > 65535) {
      errors.push('Server port must be between 1024 and 65535');
    }

    if (this.config.auth.tokenExpiry < 300) {
      errors.push('Token expiry should be at least 5 minutes');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export configuration for external use
  export() {
    return {
      ...this.config,
      serverUrl: this.getServerUrl(),
      databaseUrl: this.getDatabaseUrl(),
      environment: this.environment,
      timestamp: new Date().toISOString()
    };
  }

  // Create Supabase-compatible configuration
  toSupabaseConfig() {
    return {
      url: this.getServerUrl(),
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'ai-readiness-mock'
        }
      }
    };
  }
}

// Export singleton instance
let configInstance = null;

function getConfig(environment = process.env.NODE_ENV || 'test') {
  if (!configInstance || configInstance.environment !== environment) {
    configInstance = new MockServerConfig(environment);
  }
  return configInstance;
}

module.exports = {
  MockServerConfig,
  getConfig,
  
  // Export commonly used configurations
  getServerConfig: () => getConfig().config.server,
  getAuthConfig: () => getConfig().config.auth,
  getApiConfig: () => getConfig().config.api,
  getDatabaseConfig: () => getConfig().config.database,
  getTestConfig: () => getConfig().config.testing
};