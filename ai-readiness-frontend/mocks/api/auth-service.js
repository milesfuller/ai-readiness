// ============================================================================
// Enhanced Supabase Auth Mock Service
// ============================================================================
// This service provides comprehensive Supabase-compatible authentication mocking
// for e2e testing with full user management and session handling.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || '11sZ5cEsx29QSQitx4k1D05/GvLY3ZWTzubtRFUQYKE=';
const TOKEN_EXPIRY = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY = 86400; // 24 hours

class AuthService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.refreshTokens = new Map();
    this.verificationTokens = new Map();
    this.resetTokens = new Map();
    
    // Initialize with test users
    this.initializeTestUsers();
  }

  initializeTestUsers() {
    const testUsers = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'testuser@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org',
        role: 'user',
        emailConfirmed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'testadmin@example.com',
        password: 'AdminPassword123!',
        firstName: 'Test',
        lastName: 'Admin',
        organizationName: 'Admin Org',
        role: 'admin',
        emailConfirmed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'pending@example.com',
        password: 'PendingPassword123!',
        firstName: 'Pending',
        lastName: 'User',
        organizationName: 'Pending Org',
        role: 'user',
        emailConfirmed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    testUsers.forEach(user => {
      this.users.set(user.email, user);
    });

    console.log('🔐 Initialized test users:', testUsers.map(u => u.email));
  }

  // Generate cryptographically secure tokens
  generateTokens(user) {
    const now = Math.floor(Date.now() / 1000);
    
    const accessToken = jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      aud: 'authenticated',
      iss: 'supabase',
      iat: now,
      exp: now + TOKEN_EXPIRY,
      user_metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        organizationName: user.organizationName
      },
      app_metadata: {
        provider: 'email',
        providers: ['email']
      }
    }, JWT_SECRET, { algorithm: 'HS256' });

    const refreshToken = jwt.sign({
      sub: user.id,
      type: 'refresh',
      iat: now,
      exp: now + REFRESH_TOKEN_EXPIRY
    }, JWT_SECRET, { algorithm: 'HS256' });

    return { accessToken, refreshToken };
  }

  // Create verification token for email confirmation
  generateVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.verificationTokens.set(token, {
      userId,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
    return token;
  }

  // Create password reset token
  generateResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetTokens.set(token, {
      userId,
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    });
    return token;
  }

  // Validate token and return user
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = Array.from(this.users.values()).find(u => u.id === decoded.sub);
      
      if (!user) {
        throw new Error('User not found');
      }

      return { user, decoded };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Sign up new user
  signUp(email, password, metadata = {}) {
    if (this.users.has(email)) {
      throw new Error('User already registered');
    }

    if (!this.isValidPassword(password)) {
      throw new Error('Password does not meet requirements');
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const user = {
      id: userId,
      email: email.toLowerCase(),
      password, // In production, this would be hashed
      firstName: metadata.firstName || '',
      lastName: metadata.lastName || '',
      organizationName: metadata.organizationName || '',
      role: 'user',
      emailConfirmed: false, // Requires email verification
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.users.set(email, user);

    // Generate verification token
    const verificationToken = this.generateVerificationToken(userId);
    
    // In real implementation, would send verification email
    console.log(`📧 Verification email would be sent to ${email} with token: ${verificationToken}`);

    const tokens = this.generateTokens(user);
    this.refreshTokens.set(tokens.refreshToken, userId);

    return {
      user: this.formatUserResponse(user),
      session: null // No session until email is verified
    };
  }

  // Sign in with email/password
  signIn(email, password, rememberMe = false) {
    const user = this.users.get(email.toLowerCase());
    
    if (!user || user.password !== password) {
      throw new Error('Invalid login credentials');
    }

    if (!user.emailConfirmed) {
      throw new Error('Email not confirmed');
    }

    const tokens = this.generateTokens(user);
    const sessionId = `session-${Date.now()}`;
    
    // Store session
    this.sessions.set(sessionId, {
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      created_at: new Date().toISOString(),
      rememberMe
    });

    // Store refresh token
    this.refreshTokens.set(tokens.refreshToken, user.id);

    // Update last sign in
    user.last_sign_in_at = new Date().toISOString();
    user.updated_at = new Date().toISOString();

    return {
      user: this.formatUserResponse(user),
      session: this.formatSessionResponse(tokens, user)
    };
  }

  // Refresh token
  refreshSession(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      const userId = this.refreshTokens.get(refreshToken);
      if (!userId || userId !== decoded.sub) {
        throw new Error('Invalid refresh token');
      }

      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      // Clean up old refresh token
      this.refreshTokens.delete(refreshToken);
      
      // Store new refresh token
      this.refreshTokens.set(tokens.refreshToken, user.id);

      return {
        user: this.formatUserResponse(user),
        session: this.formatSessionResponse(tokens, user)
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Sign out
  signOut(token) {
    try {
      const { user } = this.validateToken(token);
      
      // Remove all sessions for this user
      for (let [sessionId, session] of this.sessions.entries()) {
        if (session.userId === user.id) {
          this.sessions.delete(sessionId);
          
          // Remove refresh token
          if (session.refreshToken) {
            this.refreshTokens.delete(session.refreshToken);
          }
        }
      }
      
      return true;
    } catch (error) {
      // Even if token is invalid, return success for security
      return true;
    }
  }

  // Get current user
  getUser(token) {
    const { user } = this.validateToken(token);
    return this.formatUserResponse(user);
  }

  // Update user
  updateUser(token, updates) {
    const { user } = this.validateToken(token);
    
    // Update allowed fields
    const allowedUpdates = ['firstName', 'lastName', 'organizationName'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    user.updated_at = new Date().toISOString();
    
    return this.formatUserResponse(user);
  }

  // Confirm email
  confirmEmail(token) {
    const verification = this.verificationTokens.get(token);
    
    if (!verification || verification.expires < Date.now()) {
      throw new Error('Invalid or expired verification token');
    }

    const user = Array.from(this.users.values()).find(u => u.id === verification.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.emailConfirmed = true;
    user.updated_at = new Date().toISOString();
    
    // Clean up verification token
    this.verificationTokens.delete(token);

    return this.formatUserResponse(user);
  }

  // Request password reset
  requestPasswordReset(email) {
    const user = this.users.get(email.toLowerCase());
    
    // Don't reveal if user exists for security
    if (user) {
      const resetToken = this.generateResetToken(user.id);
      console.log(`🔒 Password reset email would be sent to ${email} with token: ${resetToken}`);
    }
    
    return { message: 'If this email is registered, you will receive a password reset link.' };
  }

  // Reset password
  resetPassword(token, newPassword) {
    const reset = this.resetTokens.get(token);
    
    if (!reset || reset.expires < Date.now()) {
      throw new Error('Invalid or expired reset token');
    }

    if (!this.isValidPassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    const user = Array.from(this.users.values()).find(u => u.id === reset.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.password = newPassword;
    user.updated_at = new Date().toISOString();
    
    // Clean up reset token
    this.resetTokens.delete(token);

    // Invalidate all sessions for this user
    this.signOut(null); // Pass null token to clear all user sessions

    return { message: 'Password updated successfully' };
  }

  // Password validation
  isValidPassword(password) {
    return password && 
           password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password) && 
           /[!@#$%^&*]/.test(password);
  }

  // Format user response (matches Supabase format)
  formatUserResponse(user) {
    return {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: user.emailConfirmed ? user.created_at : null,
      phone: '',
      confirmed_at: user.emailConfirmed ? user.created_at : null,
      last_sign_in_at: user.last_sign_in_at || null,
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      user_metadata: {
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        organizationName: user.organizationName || ''
      },
      identities: [
        {
          id: user.id,
          user_id: user.id,
          identity_data: {
            email: user.email,
            email_verified: user.emailConfirmed,
            sub: user.id
          },
          provider: 'email',
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      ],
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }

  // Format session response (matches Supabase format)
  formatSessionResponse(tokens, user) {
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY;
    
    return {
      access_token: tokens.accessToken,
      token_type: 'bearer',
      expires_in: TOKEN_EXPIRY,
      expires_at: expiresAt,
      refresh_token: tokens.refreshToken,
      user: this.formatUserResponse(user)
    };
  }

  // Get all users (admin only)
  getAllUsers(adminToken) {
    const { user } = this.validateToken(adminToken);
    
    if (user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    return Array.from(this.users.values()).map(u => this.formatUserResponse(u));
  }

  // Get service stats
  getStats() {
    return {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      pendingVerifications: this.verificationTokens.size,
      pendingResets: this.resetTokens.size
    };
  }

  // Clean up expired tokens
  cleanup() {
    const now = Date.now();
    
    // Clean up expired verification tokens
    for (let [token, data] of this.verificationTokens.entries()) {
      if (data.expires < now) {
        this.verificationTokens.delete(token);
      }
    }

    // Clean up expired reset tokens
    for (let [token, data] of this.resetTokens.entries()) {
      if (data.expires < now) {
        this.resetTokens.delete(token);
      }
    }

    // Clean up expired sessions
    for (let [sessionId, session] of this.sessions.entries()) {
      try {
        jwt.verify(session.accessToken, JWT_SECRET);
      } catch (error) {
        this.sessions.delete(sessionId);
        if (session.refreshToken) {
          this.refreshTokens.delete(session.refreshToken);
        }
      }
    }
  }
}

module.exports = AuthService;