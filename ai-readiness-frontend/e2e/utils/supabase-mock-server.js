/**
 * Supabase Mock Server for E2E Tests
 * Provides comprehensive mocking of Supabase authentication and database operations
 */

const express = require('express');
const cors = require('cors');

class SupabaseMockServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = 54321;
    this.users = new Map();
    this.sessions = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Log all requests in test mode
    this.app.use((req, res, next) => {
      console.log(`[MOCK] ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Auth endpoints
    this.setupAuthRoutes();
    
    // Database endpoints
    this.setupDatabaseRoutes();
    
    // Admin endpoints
    this.setupAdminRoutes();
  }
  
  setupAuthRoutes() {
    // Sign up
    this.app.post('/auth/v1/signup', (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }
      
      if (this.users.has(email)) {
        return res.status(400).json({
          error: 'User already exists'
        });
      }
      
      const user = {
        id: `user_${Date.now()}`,
        email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        role: email.includes('admin') ? 'system_admin' : 'user'
      };
      
      this.users.set(email, { ...user, password });
      
      const session = this.createSession(user);
      
      res.json({
        user,
        session,
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
    });
    
    // Sign in
    this.app.post('/auth/v1/token', (req, res) => {
      const { email, password, grant_type } = req.body;
      
      if (grant_type === 'password') {
        return this.handlePasswordLogin(req, res);
      }
      
      if (grant_type === 'refresh_token') {
        return this.handleRefreshToken(req, res);
      }
      
      res.status(400).json({ error: 'Unsupported grant type' });
    });
    
    // Get user
    this.app.get('/auth/v1/user', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const session = this.findSessionByToken(token);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      res.json(session.user);
    });
    
    // Sign out
    this.app.post('/auth/v1/logout', (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        this.sessions.delete(token);
      }
      
      res.json({ message: 'Logged out successfully' });
    });
  }
  
  setupDatabaseRoutes() {
    // REST API endpoints
    this.app.get('/rest/v1/:table', (req, res) => {
      const { table } = req.params;
      
      // Mock data for different tables
      const mockData = {
        profiles: [
          { id: 1, user_id: 'user_123', full_name: 'Test User', email: 'testuser@example.com' },
          { id: 2, user_id: 'admin_123', full_name: 'Test Admin', email: 'testadmin@example.com' }
        ],
        assessments: [],
        survey_responses: []
      };
      
      res.json(mockData[table] || []);
    });
    
    this.app.post('/rest/v1/:table', (req, res) => {
      const { table } = req.params;
      const data = req.body;
      
      // Mock successful creation
      res.status(201).json({
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  }
  
  setupAdminRoutes() {
    // Admin health check
    this.app.get('/admin/v1/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  handlePasswordLogin(req, res) {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }
    
    const userData = this.users.get(email);
    if (!userData || userData.password !== password) {
      return res.status(400).json({
        error: 'Invalid login credentials'
      });
    }
    
    const user = { ...userData };
    delete user.password;
    
    const session = this.createSession(user);
    
    res.json({
      user,
      session,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }
  
  handleRefreshToken(req, res) {
    const { refresh_token } = req.body;
    
    const session = Array.from(this.sessions.values())
      .find(s => s.refresh_token === refresh_token);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Create new session
    const newSession = this.createSession(session.user);
    
    res.json({
      user: session.user,
      session: newSession,
      access_token: newSession.access_token,
      refresh_token: newSession.refresh_token
    });
  }
  
  createSession(user) {
    const accessToken = `sb-access-token-${Date.now()}-${Math.random()}`;
    const refreshToken = `sb-refresh-token-${Date.now()}-${Math.random()}`;
    
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user
    };
    
    this.sessions.set(accessToken, session);
    return session;
  }
  
  findSessionByToken(token) {
    return this.sessions.get(token);
  }
  
  async initializeTestData() {
    // Initialize test users
    const testUsers = [
      {
        email: 'testuser@example.com',
        password: 'TestPassword123!',
        role: 'user'
      },
      {
        email: 'testadmin@example.com',
        password: 'AdminPassword123!',
        role: 'system_admin'
      }
    ];
    
    for (const userData of testUsers) {
      const user = {
        id: `user_${userData.email.split('@')[0]}`,
        email: userData.email,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        role: userData.role
      };
      
      this.users.set(userData.email, { ...user, password: userData.password });
    }
    
    console.log(`✅ Initialized ${testUsers.length} test users`);
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`🚀 Supabase mock server running on port ${this.port}`);
          resolve();
        }
      });
    });
  }
  
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('🛑 Supabase mock server stopped');
          resolve();
        });
      });
    }
  }
  
  async cleanup() {
    this.users.clear();
    this.sessions.clear();
    console.log('🧹 Test data cleared');
  }
}

// Singleton instance
const mockServer = new SupabaseMockServer();

module.exports = mockServer;