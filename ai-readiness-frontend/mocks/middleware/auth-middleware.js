// ============================================================================
// Authentication Middleware for Mock Server
// ============================================================================
// This middleware provides JWT validation, session management, and role-based
// access control for the mock server environment.

const jwt = require('jsonwebtoken');

class AuthMiddleware {
  constructor(authService) {
    this.authService = authService;
    this.JWT_SECRET = process.env.JWT_SECRET || '11sZ5cEsx29QSQitx4k1D05/GvLY3ZWTzubtRFUQYKE=';
  }

  // Extract token from request headers or cookies
  extractToken(req) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies['supabase-auth-token'];
    const apiKey = req.headers.apikey;
    
    // Priority: Bearer token > Cookie > API key
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return { token: authHeader.substring(7), source: 'bearer' };
    } else if (cookieToken) {
      return { token: cookieToken, source: 'cookie' };
    } else if (apiKey) {
      return { token: apiKey, source: 'apikey' };
    }
    
    return null;
  }

  // Validate JWT token and return user context
  validateToken(tokenInfo) {
    if (!tokenInfo) {
      throw new Error('No authentication token provided');
    }

    try {
      const decoded = jwt.verify(tokenInfo.token, this.JWT_SECRET);
      
      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token has expired');
      }

      // Get user from auth service
      const user = this.authService.getUser(tokenInfo.token);
      
      return {
        user,
        decoded,
        tokenSource: tokenInfo.source
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid authentication token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Authentication token has expired');
      } else {
        throw error;
      }
    }
  }

  // Middleware: Require authentication
  requireAuth() {
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        // Add user context to request
        req.user = authContext.user;
        req.authContext = authContext;
        
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Unauthorized',
          error_description: error.message,
          required: 'Valid authentication token'
        });
      }
    };
  }

  // Middleware: Optional authentication (adds user context if available)
  optionalAuth() {
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        if (tokenInfo) {
          const authContext = this.validateToken(tokenInfo);
          req.user = authContext.user;
          req.authContext = authContext;
        }
      } catch (error) {
        // Optional auth - continue without user context
        console.log('Optional auth failed:', error.message);
      }
      
      next();
    };
  }

  // Middleware: Require specific role
  requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        const userRole = authContext.user.user_metadata?.role || 'user';
        
        if (!roles.includes(userRole)) {
          return res.status(403).json({
            error: 'Insufficient Permissions',
            error_description: `Access denied. Required role: ${roles.join(' or ')}`,
            user_role: userRole
          });
        }

        req.user = authContext.user;
        req.authContext = authContext;
        
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Unauthorized',
          error_description: error.message,
          required: 'Valid authentication token with appropriate role'
        });
      }
    };
  }

  // Middleware: Require admin role
  requireAdmin() {
    return this.requireRole(['admin']);
  }

  // Middleware: Require user to own the resource or be admin
  requireOwnershipOrAdmin(getResourceUserId) {
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        const currentUserId = authContext.user.id;
        const currentUserRole = authContext.user.user_metadata?.role || 'user';
        
        // Admin can access anything
        if (currentUserRole === 'admin') {
          req.user = authContext.user;
          req.authContext = authContext;
          return next();
        }

        // Get the user ID that owns the resource
        const resourceUserId = typeof getResourceUserId === 'function' 
          ? getResourceUserId(req) 
          : req.params.userId || req.body.user_id;

        if (currentUserId !== resourceUserId) {
          return res.status(403).json({
            error: 'Access Denied',
            error_description: 'You can only access your own resources',
            resource_owner: resourceUserId,
            current_user: currentUserId
          });
        }

        req.user = authContext.user;
        req.authContext = authContext;
        
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Unauthorized',
          error_description: error.message
        });
      }
    };
  }

  // Middleware: API key validation (for service-to-service calls)
  requireApiKey(validApiKeys = []) {
    const defaultApiKeys = [
      'test-anon-key',
      'test-service-role-key',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ].filter(Boolean);

    const allValidKeys = [...defaultApiKeys, ...validApiKeys];

    return (req, res, next) => {
      const apiKey = req.headers.apikey || req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'Missing API Key',
          error_description: 'API key is required for this endpoint'
        });
      }

      if (!allValidKeys.includes(apiKey)) {
        return res.status(401).json({
          error: 'Invalid API Key',
          error_description: 'The provided API key is not valid'
        });
      }

      // Add API key context
      req.apiKeyContext = {
        key: apiKey,
        type: apiKey.includes('anon') ? 'anonymous' : 'service'
      };

      next();
    };
  }

  // Middleware: Rate limiting by user
  rateLimitByUser(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 100,
      message = 'Too many requests from this user'
    } = options;

    const userRequests = new Map();

    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        const userId = authContext.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get or create user request log
        if (!userRequests.has(userId)) {
          userRequests.set(userId, []);
        }

        const requests = userRequests.get(userId);
        
        // Clean old requests
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        userRequests.set(userId, recentRequests);

        // Check rate limit
        if (recentRequests.length >= maxRequests) {
          const resetTime = new Date(recentRequests[0] + windowMs);
          
          return res.status(429).json({
            error: 'Rate Limit Exceeded',
            error_description: message,
            retry_after: Math.ceil((resetTime - now) / 1000),
            reset_time: resetTime.toISOString()
          });
        }

        // Add current request
        recentRequests.push(now);

        req.user = authContext.user;
        req.authContext = authContext;

        next();
      } catch (error) {
        // If auth fails, apply IP-based rate limiting instead
        next();
      }
    };
  }

  // Middleware: Session validation
  requireValidSession() {
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        // Additional session checks can be added here
        // For example, checking if session is still active in database
        
        req.user = authContext.user;
        req.authContext = authContext;
        
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Invalid Session',
          error_description: error.message,
          action: 'Please log in again'
        });
      }
    };
  }

  // Middleware: Check email verification
  requireEmailVerified() {
    return (req, res, next) => {
      try {
        const tokenInfo = this.extractToken(req);
        const authContext = this.validateToken(tokenInfo);
        
        if (!authContext.user.email_confirmed_at) {
          return res.status(403).json({
            error: 'Email Not Verified',
            error_description: 'Please verify your email address before accessing this resource',
            action: 'Check your email for verification link'
          });
        }

        req.user = authContext.user;
        req.authContext = authContext;
        
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Unauthorized',
          error_description: error.message
        });
      }
    };
  }

  // Utility: Get user ID from request context
  getUserId(req) {
    return req.user?.id || null;
  }

  // Utility: Get user role from request context
  getUserRole(req) {
    return req.user?.user_metadata?.role || 'user';
  }

  // Utility: Check if user is admin
  isAdmin(req) {
    return this.getUserRole(req) === 'admin';
  }

  // Utility: Check if user owns resource
  ownsResource(req, resourceUserId) {
    const currentUserId = this.getUserId(req);
    return currentUserId === resourceUserId || this.isAdmin(req);
  }

  // Debug middleware: Log authentication context
  debugAuth() {
    return (req, res, next) => {
      const tokenInfo = this.extractToken(req);
      
      console.log('🔐 Auth Debug:', {
        method: req.method,
        path: req.path,
        hasToken: !!tokenInfo,
        tokenSource: tokenInfo?.source,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.user_metadata?.role
        } : null
      });

      next();
    };
  }
}

module.exports = AuthMiddleware;