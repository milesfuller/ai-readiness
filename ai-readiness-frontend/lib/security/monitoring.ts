/**
 * Security Monitoring and Logging System
 * Provides comprehensive security event monitoring, logging, and alerting
 */

import { NextRequest } from 'next/server'

// Security event types
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_ATTACK = 'csrf_attack',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHORIZATION_FAILURE = 'authorization_failure',
  SUSPICIOUS_USER_AGENT = 'suspicious_user_agent',
  LARGE_PAYLOAD = 'large_payload',
  REPEATED_FAILED_REQUESTS = 'repeated_failed_requests',
  SECURITY_HEADER_VIOLATION = 'security_header_violation',
  PROTOCOL_VIOLATION = 'protocol_violation',
  SUSPICIOUS_IP = 'suspicious_ip'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security event interface
export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: SecuritySeverity
  timestamp: number
  ip: string
  userAgent: string
  userId?: string
  sessionId?: string
  url: string
  method: string
  details: Record<string, any>
  blocked: boolean
  location?: {
    country?: string
    region?: string
    city?: string
  }
}

// Security metrics interface
export interface SecurityMetrics {
  totalEvents: number
  eventsByType: Record<SecurityEventType, number>
  eventsBySeverity: Record<SecuritySeverity, number>
  blockedRequests: number
  uniqueIPs: Set<string>
  timeWindow: {
    start: number
    end: number
  }
}

// Alert configuration
export interface SecurityAlert {
  type: SecurityEventType
  threshold: number
  timeWindow: number // in milliseconds
  enabled: boolean
  webhookUrl?: string
  emailNotification?: boolean
}

class SecurityMonitor {
  private events: SecurityEvent[] = []
  private alerts: SecurityAlert[] = []
  private maxEventsInMemory = 10000
  private cleanupInterval: NodeJS.Timeout
  private alertCounts = new Map<string, { count: number; resetTime: number }>()

  constructor() {
    // Clean up old events every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)

    // Initialize default alerts
    this.initializeDefaultAlerts()
  }

  private initializeDefaultAlerts(): void {
    this.alerts = [
      {
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        threshold: 10,
        timeWindow: 15 * 60 * 1000, // 15 minutes
        enabled: true
      },
      {
        type: SecurityEventType.CSRF_ATTACK,
        threshold: 3,
        timeWindow: 5 * 60 * 1000, // 5 minutes
        enabled: true
      },
      {
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        threshold: 1,
        timeWindow: 60 * 1000, // 1 minute
        enabled: true
      },
      {
        type: SecurityEventType.XSS_ATTEMPT,
        threshold: 1,
        timeWindow: 60 * 1000, // 1 minute
        enabled: true
      },
      {
        type: SecurityEventType.REPEATED_FAILED_REQUESTS,
        threshold: 20,
        timeWindow: 10 * 60 * 1000, // 10 minutes
        enabled: true
      }
    ]
  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    request: NextRequest,
    details: Record<string, any> = {},
    blocked: boolean = false
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: Date.now(),
      ip: this.extractIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      userId: request.headers.get('x-user-id') || undefined,
      sessionId: this.extractSessionId(request),
      url: request.url,
      method: request.method,
      details,
      blocked
    }

    // Add to events array
    this.events.push(event)

    // Keep only recent events in memory
    if (this.events.length > this.maxEventsInMemory) {
      this.events.shift()
    }

    // Check for alerts
    this.checkAlerts(event)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${type}: ${JSON.stringify(event, null, 2)}`)
    }

    // In production, you would send to your logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(event)
    }

    return event
  }

  /**
   * Check if an event triggers any alerts
   */
  private checkAlerts(event: SecurityEvent): void {
    const relevantAlerts = this.alerts.filter(
      alert => alert.enabled && alert.type === event.type
    )

    for (const alert of relevantAlerts) {
      const key = `${alert.type}:${event.ip}`
      const now = Date.now()
      
      let alertData = this.alertCounts.get(key)
      if (!alertData || alertData.resetTime <= now) {
        alertData = { count: 0, resetTime: now + alert.timeWindow }
        this.alertCounts.set(key, alertData)
      }

      alertData.count += 1

      if (alertData.count >= alert.threshold) {
        this.triggerAlert(alert, event, alertData.count)
        // Reset counter after triggering alert
        this.alertCounts.delete(key)
      }
    }
  }

  /**
   * Trigger a security alert
   */
  private async triggerAlert(
    alert: SecurityAlert,
    event: SecurityEvent,
    count: number
  ): Promise<void> {
    const alertMessage = {
      alert: alert.type,
      severity: event.severity,
      threshold: alert.threshold,
      actualCount: count,
      timeWindow: alert.timeWindow,
      event: {
        ip: event.ip,
        userAgent: event.userAgent,
        url: event.url,
        timestamp: event.timestamp
      }
    }

    console.error(`[SECURITY ALERT] ${alert.type}:`, alertMessage)

    // Send webhook notification if configured
    if (alert.webhookUrl) {
      try {
        await fetch(alert.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(alertMessage)
        })
      } catch (error) {
        console.error('Failed to send security alert webhook:', error)
      }
    }
  }

  /**
   * Get security metrics for a time period
   */
  getMetrics(timeWindow: number = 24 * 60 * 60 * 1000): SecurityMetrics {
    const now = Date.now()
    const start = now - timeWindow
    
    const recentEvents = this.events.filter(event => event.timestamp >= start)
    
    const eventsByType: Record<SecurityEventType, number> = {} as any
    const eventsBySeverity: Record<SecuritySeverity, number> = {} as any
    const uniqueIPs = new Set<string>()

    let blockedRequests = 0

    for (const event of recentEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      uniqueIPs.add(event.ip)
      
      if (event.blocked) {
        blockedRequests += 1
      }
    }

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      blockedRequests,
      uniqueIPs,
      timeWindow: { start, end: now }
    }
  }

  /**
   * Get events by type and time range
   */
  getEvents(
    type?: SecurityEventType,
    severity?: SecuritySeverity,
    timeWindow: number = 24 * 60 * 60 * 1000,
    limit: number = 100
  ): SecurityEvent[] {
    const now = Date.now()
    const start = now - timeWindow
    
    let filteredEvents = this.events.filter(event => event.timestamp >= start)
    
    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type)
    }
    
    if (severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === severity)
    }
    
    return filteredEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Check if an IP should be blocked based on recent activity
   */
  shouldBlockIP(ip: string): boolean {
    const recentEvents = this.getEvents(
      undefined,
      undefined,
      15 * 60 * 1000 // Last 15 minutes
    ).filter(event => event.ip === ip)

    // Block if too many high/critical severity events
    const highSeverityEvents = recentEvents.filter(
      event => event.severity === SecuritySeverity.HIGH || 
               event.severity === SecuritySeverity.CRITICAL
    ).length

    if (highSeverityEvents >= 5) {
      return true
    }

    // Block if too many total security events
    if (recentEvents.length >= 20) {
      return true
    }

    return false
  }

  /**
   * Add or update alert configuration
   */
  configureAlert(alert: SecurityAlert): void {
    const existingIndex = this.alerts.findIndex(a => a.type === alert.type)
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = alert
    } else {
      this.alerts.push(alert)
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    return request.ip || 'unknown'
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: NextRequest): string | undefined {
    // Try to get session from Supabase cookies
    const authCookie = request.cookies.get('sb-access-token')?.value
    if (authCookie) {
      // Return a hash of the token for privacy
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(authCookie).digest('hex').substring(0, 16)
    }
    return undefined
  }

  /**
   * Send event to external logging service
   */
  private async sendToLoggingService(event: SecurityEvent): Promise<void> {
    // In a real application, you would send to services like:
    // - Datadog
    // - Splunk
    // - ELK Stack
    // - Custom logging endpoint
    
    // Example implementation:
    if (process.env.SECURITY_LOGGING_WEBHOOK) {
      try {
        await fetch(process.env.SECURITY_LOGGING_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SECURITY_LOGGING_TOKEN}`
          },
          body: JSON.stringify(event)
        })
      } catch (error) {
        console.error('Failed to send security event to logging service:', error)
      }
    }
  }

  /**
   * Clean up old events
   */
  private cleanup(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000) // Keep 7 days
    this.events = this.events.filter(event => event.timestamp > cutoff)
    
    // Clean up alert counts
    const now = Date.now()
    for (const [key, data] of this.alertCounts.entries()) {
      if (data.resetTime <= now) {
        this.alertCounts.delete(key)
      }
    }
  }

  /**
   * Export security report
   */
  generateSecurityReport(timeWindow: number = 24 * 60 * 60 * 1000): any {
    const metrics = this.getMetrics(timeWindow)
    const topEvents = this.getEvents(undefined, undefined, timeWindow, 50)
    
    return {
      summary: {
        timeWindow: {
          start: new Date(metrics.timeWindow.start).toISOString(),
          end: new Date(metrics.timeWindow.end).toISOString()
        },
        totalEvents: metrics.totalEvents,
        blockedRequests: metrics.blockedRequests,
        uniqueIPs: metrics.uniqueIPs.size
      },
      eventsByType: metrics.eventsByType,
      eventsBySeverity: metrics.eventsBySeverity,
      recentEvents: topEvents.map(event => ({
        type: event.type,
        severity: event.severity,
        timestamp: new Date(event.timestamp).toISOString(),
        ip: event.ip,
        url: event.url,
        blocked: event.blocked
      })),
      alertConfiguration: this.alerts
    }
  }

  /**
   * Cleanup for graceful shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.events = []
    this.alertCounts.clear()
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor()

/**
 * Middleware factory for security monitoring
 */
export function createSecurityMonitoringMiddleware() {
  return (request: NextRequest) => {
    // Log basic request information
    const startTime = Date.now()
    
    return {
      logEvent: (
        type: SecurityEventType,
        severity: SecuritySeverity,
        details: Record<string, any> = {},
        blocked: boolean = false
      ) => {
        return securityMonitor.logEvent(type, severity, request, {
          ...details,
          processingTime: Date.now() - startTime
        }, blocked)
      },
      
      shouldBlock: () => {
        const ip = securityMonitor['extractIP'](request)
        return securityMonitor.shouldBlockIP(ip)
      },
      
      getMetrics: () => securityMonitor.getMetrics(),
      
      getEvents: (type?: SecurityEventType, severity?: SecuritySeverity) => 
        securityMonitor.getEvents(type, severity)
    }
  }
}

/**
 * Suspicious pattern detection
 */
export function detectSuspiciousPatterns(request: NextRequest): {
  suspicious: boolean
  patterns: string[]
  severity: SecuritySeverity
} {
  const patterns: string[] = []
  let maxSeverity = SecuritySeverity.LOW
  
  const userAgent = request.headers.get('user-agent') || ''
  const url = request.url
  
  // Check for common attack patterns
  const suspiciousUserAgents = [
    /curl/i,
    /wget/i,
    /scanner/i,
    /bot/i,
    /crawler/i,
    /sqlmap/i,
    /nmap/i,
    /nikto/i
  ]
  
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      patterns.push(`Suspicious user agent: ${userAgent}`)
      maxSeverity = SecuritySeverity.MEDIUM
      break
    }
  }
  
  // Check for path traversal attempts
  if (url.includes('../') || url.includes('..\\')) {
    patterns.push('Path traversal attempt detected')
    maxSeverity = SecuritySeverity.HIGH
  }
  
  // Check for common attack paths
  const attackPaths = [
    '/admin',
    '/phpmyadmin',
    '/wp-admin',
    '/.env',
    '/config',
    '/api/v1/auth/login',
    '/login.php'
  ]
  
  for (const path of attackPaths) {
    if (url.includes(path) && !url.startsWith(process.env.NEXT_PUBLIC_APP_URL || '')) {
      patterns.push(`Access to sensitive path: ${path}`)
      maxSeverity = SecuritySeverity.MEDIUM
    }
  }
  
  return {
    suspicious: patterns.length > 0,
    patterns,
    severity: maxSeverity
  }
}

export default securityMonitor