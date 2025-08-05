const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();

// Configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || '11sZ5cEsx29QSQitx4k1D05/GvLY3ZWTzubtRFUQYKE=';
const PORT = process.env.SUPABASE_PORT || 54321;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info']
}));
app.use(express.json());
app.use(cookieParser());

// In-memory user store
const users = new Map();
const sessions = new Map();

// Add test users
users.set('testuser@example.com', {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  created_at: new Date().toISOString(),
  role: 'user'
});

users.set('testadmin@example.com', {
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'testadmin@example.com',
  password: 'AdminPassword123!',
  created_at: new Date().toISOString(),
  role: 'admin'
});

// Helper functions
function generateTokens(user) {
  const accessToken = jwt.sign(
    { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    JWT_SECRET
  );
  
  const refreshToken = jwt.sign(
    { 
      sub: user.id,
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 86400
    },
    JWT_SECRET
  );
  
  return { accessToken, refreshToken };
}

// Auth endpoints
app.post('/auth/v1/signup', (req, res) => {
  const { email, password, data } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Signup requires valid email and password',
      error_description: 'Email and password are required'
    });
  }
  
  if (users.has(email)) {
    return res.status(400).json({ 
      error: 'User already registered',
      error_description: 'A user with this email address has already been registered'
    });
  }
  
  const user = {
    id: `user-${Date.now()}`,
    email,
    password,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    organizationName: data?.organizationName || ''
  };
  
  users.set(email, user);
  const tokens = generateTokens(user);
  const expiresAt = new Date(Date.now() + 3600000);
  
  // Return full Supabase-compatible signup response
  res.json({
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: null, // In real Supabase, this would be null until confirmed
      phone: '',
      confirmed_at: null,
      last_sign_in_at: null,
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      user_metadata: {
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationName: user.organizationName
      },
      identities: [
        {
          id: user.id,
          user_id: user.id,
          identity_data: {
            email: user.email
          },
          provider: 'email',
          created_at: user.created_at,
          updated_at: user.created_at
        }
      ],
      created_at: user.created_at,
      updated_at: user.updated_at
    },
    session: {
      access_token: tokens.accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }
  });
});

app.post('/auth/v1/token', (req, res) => {
  const { email, password, grant_type } = req.body;
  
  if (grant_type === 'password') {
    const user = users.get(email);
    
    if (!user || user.password !== password) {
      return res.status(400).json({ 
        error: 'Invalid login credentials',
        error_description: 'Invalid login credentials'
      });
    }
    
    const tokens = generateTokens(user);
    const sessionId = `session-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600000);
    
    // Create session data matching Supabase format
    const sessionData = {
      user_id: user.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    sessions.set(sessionId, sessionData);
    
    // Support remember me functionality with cookies
    const rememberMe = req.body.remember_me || req.body.rememberMe;
    if (rememberMe) {
      res.cookie('supabase-auth-token', tokens.accessToken, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
      });
    }
    
    // Return full Supabase-compatible response
    res.json({
      access_token: tokens.accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        email_confirmed_at: user.created_at,
        phone: '',
        confirmed_at: user.created_at,
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        user_metadata: {
          role: user.role,
          firstName: user.firstName || '',
          lastName: user.lastName || ''
        },
        identities: [
          {
            id: user.id,
            user_id: user.id,
            identity_data: {
              email: user.email
            },
            provider: 'email',
            created_at: user.created_at,
            updated_at: user.created_at
          }
        ],
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      },
      session: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } else if (grant_type === 'refresh_token') {
    // Handle refresh token
    const { refresh_token } = req.body;
    
    try {
      const decoded = jwt.verify(refresh_token, JWT_SECRET);
      const user = Array.from(users.values()).find(u => u.id === decoded.sub);
      
      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid refresh token',
          error_description: 'Invalid refresh token'
        });
      }
      
      const tokens = generateTokens(user);
      const expiresAt = new Date(Date.now() + 3600000);
      
      res.json({
        access_token: tokens.accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        refresh_token: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Invalid refresh token',
        error_description: 'Invalid refresh token'
      });
    }
  } else {
    res.status(400).json({ 
      error: 'Unsupported grant type',
      error_description: 'Unsupported grant type'
    });
  }
});

app.post('/auth/v1/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Remove session from memory
      for (let [sessionId, session] of sessions.entries()) {
        if (session.access_token === token) {
          sessions.delete(sessionId);
          break;
        }
      }
    } catch (error) {
      // Token invalid, but still clear cookies
    }
  }
  
  // Clear remember me cookie
  res.clearCookie('supabase-auth-token');
  
  // Return empty response as per Supabase spec
  res.status(204).send();
});

app.get('/auth/v1/user', (req, res) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies['supabase-auth-token'];
  
  // Try Bearer token first, then cookie
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      error_description: 'No authorization token provided'
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === decoded.sub);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        error_description: 'The user account could not be found'
      });
    }
    
    // Return full Supabase-compatible user object
    res.json({
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: user.created_at,
      phone: '',
      confirmed_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || user.created_at,
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      user_metadata: {
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      },
      identities: [
        {
          id: user.id,
          user_id: user.id,
          identity_data: {
            email: user.email
          },
          provider: 'email',
          created_at: user.created_at,
          updated_at: user.created_at
        }
      ],
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Invalid token',
      error_description: 'The access token is invalid or expired'
    });
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/auth/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// REST API mock endpoints
app.get('/rest/v1/', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Mock table endpoints
app.get('/rest/v1/:table', (req, res) => {
  res.json([]);
});

app.post('/rest/v1/:table', (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Additional test endpoints for environment validation
app.get('/api/check-env', (req, res) => {
  res.json({
    status: 'ok',
    supabase: {
      url: `http://localhost:${PORT}`,
      anonKey: 'test-anon-key'
    },
    environment: 'test'
  });
});

app.get('/api/supabase-diagnostics', (req, res) => {
  res.json({
    status: 'healthy',
    connection: true,
    version: '1.0.0',
    services: {
      auth: true,
      rest: true
    }
  });
});

// Password reset endpoint
app.post('/auth/v1/recover', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      error: 'Email required',
      error_description: 'Email is required for password recovery'
    });
  }
  
  const user = users.get(email);
  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      message: 'If this email is registered, you will receive a password reset link.'
    });
  }
  
  // In real implementation, would send email
  res.json({
    message: 'Password recovery email sent successfully'
  });
});

// Session refresh endpoint (alternative to token endpoint)
app.post('/auth/v1/refresh', (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({
      error: 'Refresh token required',
      error_description: 'A refresh token is required'
    });
  }
  
  try {
    const decoded = jwt.verify(refresh_token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === decoded.sub);
    
    if (!user) {
      return res.status(400).json({
        error: 'Invalid refresh token',
        error_description: 'The refresh token is invalid'
      });
    }
    
    const tokens = generateTokens(user);
    const expiresAt = new Date(Date.now() + 3600000);
    
    res.json({
      access_token: tokens.accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Invalid refresh token',
      error_description: 'The refresh token is invalid or expired'
    });
  }
});

// Session verification endpoint
app.get('/auth/v1/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies['supabase-auth-token'];
  
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) {
    return res.json({
      session: null,
      user: null
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === decoded.sub);
    
    if (!user) {
      return res.json({
        session: null,
        user: null
      });
    }
    
    const expiresAt = new Date(decoded.exp * 1000);
    
    res.json({
      session: {
        access_token: token,
        refresh_token: null, // Would need to be tracked separately
        expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.json({
      session: null,
      user: null
    });
  }
});

// Mock API endpoints that the app expects
app.get('/api/debug-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies['supabase-auth-token'];
  
  let authenticated = false;
  let user = null;
  let session = null;
  
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const foundUser = Array.from(users.values()).find(u => u.id === decoded.sub);
      
      if (foundUser) {
        authenticated = true;
        user = {
          id: foundUser.id,
          email: foundUser.email,
          role: foundUser.role
        };
        session = {
          access_token: token,
          user: user
        };
      }
    } catch (error) {
      // Token invalid, return defaults
    }
  }
  
  res.json({
    authenticated,
    user,
    session
  });
});

// Start server with enhanced logging
const server = app.listen(PORT, () => {
  console.log(`🚀 Enhanced Mock Supabase server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('   📊 Health & Status:');
  console.log('     - GET  /health');
  console.log('     - GET  /auth/v1/health');
  console.log('     - GET  /api/check-env');
  console.log('     - GET  /api/supabase-diagnostics');
  console.log('');
  console.log('   🔐 Authentication:');
  console.log('     - POST /auth/v1/signup');
  console.log('     - POST /auth/v1/token (login with remember me support)');
  console.log('     - POST /auth/v1/refresh (refresh tokens)');
  console.log('     - POST /auth/v1/recover (password reset)');
  console.log('     - GET  /auth/v1/user (with cookie support)');
  console.log('     - GET  /auth/v1/session (session verification)');
  console.log('     - POST /auth/v1/logout (clears sessions & cookies)');
  console.log('');
  console.log('   🐛 Debug:');
  console.log('     - GET  /api/debug-auth (enhanced auth state)');
  console.log('');
  console.log('   📊 REST API:');
  console.log('     - GET  /rest/v1/');
  console.log('     - GET  /rest/v1/:table');
  console.log('     - POST /rest/v1/:table');
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   - testuser@example.com / TestPassword123!');
  console.log('   - testadmin@example.com / AdminPassword123!');
  console.log('');
  console.log('✨ New features:');
  console.log('   - 🍪 Cookie-based remember me functionality');
  console.log('   - 📱 Full Supabase-compatible user objects');
  console.log('   - 🔄 Proper session management');
  console.log('   - 🔐 Enhanced token validation');
  console.log('   - 📧 Password reset endpoint');
  console.log('');
  console.log('✅ Enhanced mock server ready for testing');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Mock server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📡 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Mock server shut down gracefully');
    process.exit(0);
  });
});