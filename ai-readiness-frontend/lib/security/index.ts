/**
 * Security Module Export Index
 * Centralized exports for all security components
 */

// Security Headers
export {
  applySecurityHeaders,
  createSecurityHeadersMiddleware,
  applyAPISecurityHeaders,
  validateCSPDirective,
  defaultSecurityConfig,
  type SecurityHeadersConfig
} from './headers'

// Rate Limiting
export {
  checkRateLimit,
  applyRateLimitHeaders,
  createRateLimitMiddleware,
  withRateLimit,
  rateLimitConfigs,
  rateLimiter,
  cleanup as cleanupRateLimit,
  type RateLimitConfig,
  type RateLimitResult
} from './rate-limiter'

// Input Validation
export {
  sanitizeHtml,
  sanitizeBasic,
  sanitizeSearchQuery,
  validateFile,
  sanitizeFileName,
  validateJSON,
  validateInput,
  validationSchemas,
  fileValidationOptions,
  type FileValidationOptions
} from './validation'

// CSRF Protection
export {
  createCSRFToken,
  validateCSRFToken,
  csrfProtection,
  withCSRFProtection,
  generateCSRFTokenForForm,
  getCSRFTokenFromResponse,
  cleanup as cleanupCSRF,
  DoubleSubmitCSRF,
  type CSRFConfig
} from './csrf'

// Security Monitoring
export {
  securityMonitor,
  createSecurityMonitoringMiddleware,
  detectSuspiciousPatterns,
  SecurityEventType,
  SecuritySeverity,
  type SecurityEvent,
  type SecurityMetrics,
  type SecurityAlert
} from './monitoring'

// Combined Security Middleware
export { createComprehensiveSecurityMiddleware } from './middleware'