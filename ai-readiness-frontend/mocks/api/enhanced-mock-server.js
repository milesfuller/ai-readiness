// ============================================================================
// Enhanced Mock Server with Comprehensive API Mocking
// ============================================================================
// This server provides full Supabase-compatible API mocking with authentication,
// database operations, and AI services for comprehensive e2e testing.

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const AuthService = require('./auth-service');
const DatabaseService = require('./database-service');

class EnhancedMockServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || process.env.SUPABASE_PORT || 54321;
    this.host = options.host || 'localhost';
    
    // Initialize services
    this.authService = new AuthService();
    this.dbService = new DatabaseService();
    
    // Request tracking
    this.requestLog = [];
    this.maxLogSize = 1000;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
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
        'x-supabase-auth'
      ]
    }));

    // Rate limiting (more permissive for testing)
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Allow 1000 requests per window
      message: { error: 'Too many requests', retry_after: 900 }
    });
    this.app.use('/auth/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    // Request logging middleware
    this.app.use((req, res, next) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.method !== 'GET' ? req.body : undefined,
        ip: req.ip
      };

      this.requestLog.push(logEntry);
      
      // Keep log size manageable
      if (this.requestLog.length > this.maxLogSize) {
        this.requestLog = this.requestLog.slice(-this.maxLogSize);
      }

      console.log(`📡 ${req.method} ${req.url} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoints
    this.setupHealthRoutes();
    
    // Authentication routes
    this.setupAuthRoutes();
    
    // Database REST API routes
    this.setupDatabaseRoutes();
    
    // AI/LLM service routes
    this.setupAIRoutes();
    
    // Admin/Debug routes
    this.setupAdminRoutes();
    
    // Application API routes
    this.setupAppRoutes();
  }

  setupHealthRoutes() {
    // Basic health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          auth: 'operational',
          database: 'operational',
          ai: 'operational'
        },
        stats: this.authService.getStats()
      });
    });

    // Auth service health
    this.app.get('/auth/v1/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        features: ['signup', 'signin', 'refresh', 'email_confirmation', 'password_reset']
      });
    });

    // Database health
    this.app.get('/rest/v1/', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        tables: this.dbService.getAllStats()
      });
    });
  }

  setupAuthRoutes() {
    // Sign up
    this.app.post('/auth/v1/signup', (req, res) => {
      try {
        const { email, password, data } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({
            error: 'Signup requires valid email and password',
            error_description: 'Email and password are required'
          });
        }

        const result = this.authService.signUp(email, password, data || {});
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          error_description: error.message
        });
      }
    });

    // Sign in
    this.app.post('/auth/v1/token', (req, res) => {
      try {
        const { email, password, grant_type, refresh_token } = req.body;

        if (grant_type === 'password') {
          if (!email || !password) {
            return res.status(400).json({
              error: 'Invalid login credentials',
              error_description: 'Email and password are required'
            });
          }

          const rememberMe = req.body.remember_me || req.body.rememberMe;
          const result = this.authService.signIn(email, password, rememberMe);

          // Set cookie if remember me is enabled
          if (rememberMe) {
            res.cookie('supabase-auth-token', result.session.access_token, {
              httpOnly: true,
              secure: false, // Set to true in production with HTTPS
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              sameSite: 'lax'
            });
          }

          res.json(result);
        } else if (grant_type === 'refresh_token') {
          if (!refresh_token) {
            return res.status(400).json({
              error: 'Invalid refresh token',
              error_description: 'Refresh token is required'
            });
          }

          const result = this.authService.refreshSession(refresh_token);
          res.json(result);
        } else {
          res.status(400).json({
            error: 'Unsupported grant type',
            error_description: 'Only password and refresh_token grant types are supported'
          });
        }
      } catch (error) {
        res.status(400).json({
          error: error.message,
          error_description: error.message
        });
      }
    });

    // Get current user
    this.app.get('/auth/v1/user', (req, res) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({
            error: 'Unauthorized',
            error_description: 'No authorization token provided'
          });
        }

        const user = this.authService.getUser(token);
        res.json(user);
      } catch (error) {
        res.status(401).json({
          error: error.message,
          error_description: error.message
        });
      }
    });

    // Update user
    this.app.put('/auth/v1/user', (req, res) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({
            error: 'Unauthorized',
            error_description: 'No authorization token provided'
          });
        }

        const user = this.authService.updateUser(token, req.body);
        res.json({ user });
      } catch (error) {
        res.status(400).json({
          error: error.message,
          error_description: error.message
        });
      }
    });

    // Sign out
    this.app.post('/auth/v1/logout', (req, res) => {
      try {
        const token = this.extractToken(req);
        this.authService.signOut(token);
        
        // Clear cookies
        res.clearCookie('supabase-auth-token');
        
        res.status(204).send();
      } catch (error) {
        // Always return success for logout
        res.status(204).send();
      }
    });

    // Password recovery
    this.app.post('/auth/v1/recover', (req, res) => {
      try {
        const { email } = req.body;
        const result = this.authService.requestPasswordReset(email);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          error_description: error.message
        });
      }
    });

    // Email confirmation
    this.app.post('/auth/v1/verify', (req, res) => {
      try {
        const { token, type } = req.body;
        
        if (type === 'signup') {
          const user = this.authService.confirmEmail(token);
          res.json({ user });
        } else {
          res.status(400).json({
            error: 'Unsupported verification type',
            error_description: 'Only signup verification is supported'
          });
        }
      } catch (error) {
        res.status(400).json({
          error: error.message,
          error_description: error.message
        });
      }
    });
  }

  setupDatabaseRoutes() {
    // Generic table operations
    this.app.get('/rest/v1/:table', (req, res) => {
      try {
        const { table } = req.params;
        const options = this.parseQueryParams(req.query);
        
        const results = this.dbService.select(table, options);
        
        // Set response headers similar to Supabase
        res.set('Content-Range', `0-${results.length}/${results.length}`);
        res.json(results);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          message: error.message
        });
      }
    });

    // Insert records
    this.app.post('/rest/v1/:table', (req, res) => {
      try {
        const { table } = req.params;
        const userId = this.getUserIdFromRequest(req);
        
        const result = this.dbService.insert(table, req.body, { userId });
        res.status(201).json(result);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          message: error.message
        });
      }
    });

    // Update records
    this.app.patch('/rest/v1/:table', (req, res) => {
      try {
        const { table } = req.params;
        const filters = this.parseQueryParams(req.query).filters || {};
        const userId = this.getUserIdFromRequest(req);
        
        const results = this.dbService.update(table, filters, req.body, { userId });
        res.json(results);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          message: error.message
        });
      }
    });

    // Delete records
    this.app.delete('/rest/v1/:table', (req, res) => {
      try {
        const { table } = req.params;
        const filters = this.parseQueryParams(req.query).filters || {};
        const userId = this.getUserIdFromRequest(req);
        
        const results = this.dbService.delete(table, filters, { userId });
        res.json(results);
      } catch (error) {
        res.status(400).json({
          error: error.message,
          message: error.message
        });
      }
    });

    // Upsert records
    this.app.post('/rest/v1/:table', (req, res) => {
      if (req.headers.prefer && req.headers.prefer.includes('resolution=merge-duplicates')) {
        try {
          const { table } = req.params;
          const userId = this.getUserIdFromRequest(req);
          
          const result = this.dbService.upsert(table, req.body, ['id'], { userId });
          res.status(201).json(result);
        } catch (error) {
          res.status(400).json({
            error: error.message,
            message: error.message
          });
        }
      } else {
        // Regular insert handled above
        res.status(400).json({
          error: 'Use prefer header for upsert operations',
          message: 'Set Prefer: resolution=merge-duplicates for upsert'
        });
      }
    });
  }

  setupAIRoutes() {
    // LLM Analysis endpoint
    this.app.post('/api/llm/analyze', (req, res) => {
      try {
        const { sessionId, analysisType } = req.body;
        
        // Mock AI analysis results
        const mockResults = {
          readiness_score: {
            overall: Math.floor(Math.random() * 40) + 60, // 60-100
            categories: {
              data_quality: Math.floor(Math.random() * 30) + 70,
              technical_infrastructure: Math.floor(Math.random() * 25) + 65,
              organizational_readiness: Math.floor(Math.random() * 35) + 55,
              governance: Math.floor(Math.random() * 30) + 60
            }
          },
          recommendations: [
            'Improve data governance policies',
            'Invest in cloud infrastructure',
            'Develop AI talent pipeline',
            'Establish ethics committee'
          ],
          insights: [
            'Strong technical foundation detected',
            'Leadership support is evident',
            'Data quality needs attention',
            'Risk management framework required'
          ]
        };

        // Store analysis results in database
        const analysisRecord = {
          survey_id: sessionId,
          analysis_type: analysisType || 'comprehensive',
          results: mockResults,
          confidence_score: 0.85,
          model_used: 'mock-gpt-4',
          processing_time: '2.3 seconds'
        };

        this.dbService.insert('ai_analysis_results', analysisRecord);

        res.json({
          success: true,
          data: mockResults,
          metadata: {
            processing_time: '2.3s',
            model: 'mock-gpt-4',
            confidence: 0.85
          }
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          message: 'AI analysis failed'
        });
      }
    });

    // Batch analysis
    this.app.post('/api/llm/batch', (req, res) => {
      try {
        const { sessions } = req.body;
        
        const results = sessions.map(sessionId => ({
          sessionId,
          status: 'completed',
          results: {
            readiness_score: Math.floor(Math.random() * 40) + 60,
            processing_time: Math.random() * 3 + 1
          }
        }));

        res.json({
          success: true,
          batch_id: `batch-${Date.now()}`,
          results
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          message: 'Batch analysis failed'
        });
      }
    });
  }

  setupAdminRoutes() {
    // Debug authentication
    this.app.get('/api/debug-auth', (req, res) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          return res.json({
            authenticated: false,
            user: null,
            session: null
          });
        }

        const user = this.authService.getUser(token);
        
        res.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.user_metadata.role
          },
          session: { access_token: token }
        });
      } catch (error) {
        res.json({
          authenticated: false,
          user: null,
          session: null,
          error: error.message
        });
      }
    });

    // Environment check
    this.app.get('/api/check-env', (req, res) => {
      res.json({
        status: 'ok',
        environment: 'test',
        supabase: {
          url: `http://${this.host}:${this.port}`,
          configured: true
        },
        services: {
          auth: 'operational',
          database: 'operational',
          ai: 'operational'
        }
      });
    });

    // Supabase diagnostics
    this.app.get('/api/supabase-diagnostics', (req, res) => {
      const stats = this.dbService.getAllStats();
      
      res.json({
        status: 'healthy',
        connection: true,
        version: '2.0.0-mock',
        auth_users: this.authService.getStats().totalUsers,
        tables: Object.keys(stats).length,
        total_records: Object.values(stats).reduce((sum, table) => sum + table.rowCount, 0),
        services: {
          auth: true,
          rest: true,
          realtime: false, // Not implemented in mock
          storage: false   // Not implemented in mock
        }
      });
    });

    // Request logs
    this.app.get('/api/debug/logs', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const logs = this.requestLog.slice(-limit);
      
      res.json({
        logs,
        total: this.requestLog.length,
        showing: logs.length
      });
    });

    // Reset data (testing only)
    this.app.post('/api/debug/reset', (req, res) => {
      this.dbService.reset();
      this.authService = new AuthService(); // Reinitialize auth service
      this.requestLog = [];
      
      res.json({
        success: true,
        message: 'All data reset to initial state'
      });
    });
  }

  setupAppRoutes() {
    // Survey-specific endpoints
    this.app.get('/api/surveys/:id', (req, res) => {
      try {
        const { id } = req.params;
        const surveys = this.dbService.select('surveys', {
          filters: { id }
        });

        if (surveys.length === 0) {
          return res.status(404).json({
            error: 'Survey not found'
          });
        }

        res.json(surveys[0]);
      } catch (error) {
        res.status(500).json({
          error: error.message
        });
      }
    });

    // Create survey session
    this.app.post('/api/survey-sessions', (req, res) => {
      try {
        const userId = this.getUserIdFromRequest(req);
        const session = this.dbService.insert('survey_sessions', {
          ...req.body,
          user_id: userId
        });

        res.status(201).json(session);
      } catch (error) {
        res.status(400).json({
          error: error.message
        });
      }
    });

    // Export data
    this.app.get('/api/export', (req, res) => {
      try {
        const { format = 'json' } = req.query;
        const data = this.dbService.backup();

        if (format === 'csv') {
          // Simple CSV export (would need proper CSV library in production)
          res.set('Content-Type', 'text/csv');
          res.set('Content-Disposition', 'attachment; filename="export.csv"');
          res.send('# CSV export not fully implemented in mock\n');
        } else {
          res.json(data);
        }
      } catch (error) {
        res.status(500).json({
          error: error.message
        });
      }
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        available_endpoints: [
          'GET /health',
          'POST /auth/v1/signup',
          'POST /auth/v1/token',
          'GET /auth/v1/user',
          'GET /rest/v1/:table',
          'POST /rest/v1/:table'
        ]
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      
      res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }

  // Helper methods
  extractToken(req) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies['supabase-auth-token'];
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    } else if (cookieToken) {
      return cookieToken;
    }
    
    return null;
  }

  getUserIdFromRequest(req) {
    try {
      const token = this.extractToken(req);
      if (token) {
        const user = this.authService.getUser(token);
        return user.id;
      }
    } catch (error) {
      // No user context
    }
    return null;
  }

  parseQueryParams(query) {
    const options = {
      filters: {},
      select: null,
      orderBy: null,
      limit: null,
      offset: null
    };

    // Parse filters (simple implementation)
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'select') {
        options.select = value.split(',');
      } else if (key === 'order') {
        const [field, direction] = value.split('.');
        options.orderBy = { field, direction };
      } else if (key === 'limit') {
        options.limit = parseInt(value);
      } else if (key === 'offset') {
        options.offset = parseInt(value);
      } else if (!['prefer', 'apikey'].includes(key)) {
        // Simple equality filter
        options.filters[key] = `eq.${value}`.startsWith('eq.') ? 
          value.substring(3) : value;
      }
    });

    return options;
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, this.host, () => {
        console.log('🚀 Enhanced Mock Supabase Server Started');
        console.log(`🌐 Server: http://${this.host}:${this.port}`);
        console.log('');
        console.log('📊 Available Services:');
        console.log('  ✅ Authentication (Supabase-compatible)');
        console.log('  ✅ Database REST API (PostgreSQL-style)');
        console.log('  ✅ AI/LLM Analysis Mock');
        console.log('  ✅ Admin & Debug Tools');
        console.log('');
        console.log('🔐 Test Credentials:');
        console.log('  👤 testuser@example.com / TestPassword123!');
        console.log('  👑 testadmin@example.com / AdminPassword123!');
        console.log('');
        console.log('🛠️  Key Endpoints:');
        console.log('  📋 Health: GET /health');
        console.log('  🔐 Auth: POST /auth/v1/signup, /auth/v1/token');
        console.log('  💾 Data: GET|POST /rest/v1/:table');
        console.log('  🤖 AI: POST /api/llm/analyze');
        console.log('  🐛 Debug: GET /api/debug-auth');
        console.log('');
        console.log('✨ Mock Server Ready for E2E Testing!');
        
        resolve(this.server);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Cleanup expired tokens periodically
  startCleanupTimer() {
    setInterval(() => {
      this.authService.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

module.exports = EnhancedMockServer;

// If run directly
if (require.main === module) {
  const server = new EnhancedMockServer();
  
  server.start().then(() => {
    server.startCleanupTimer();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}