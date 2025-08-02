/**
 * Security Health Check API Endpoint
 * Provides security status and health information
 */

import { NextRequest } from 'next/server'
import { getSecurityHealth } from '../../../../lib/security/config'
import { securityMonitor } from '../../../../lib/security/monitoring'
import { addAPISecurityHeaders } from '../../../../lib/security/middleware'
import { withRateLimit, rateLimitConfigs } from '../../../../lib/security/rate-limiter'

// Mark as dynamic route
export const dynamic = 'force-dynamic'

// Rate limit this endpoint
const rateLimitedHandler = withRateLimit(rateLimitConfigs.api)(handler)

async function handler(request: NextRequest) {
  try {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get basic security health
    const health = getSecurityHealth()
    
    // Get security metrics (last 24 hours)
    const metrics = securityMonitor.getMetrics(24 * 60 * 60 * 1000)
    
    // Get recent security events (last 100)
    const recentEvents = securityMonitor.getEvents(
      undefined, 
      undefined, 
      24 * 60 * 60 * 1000, 
      10
    ).map(event => ({
      type: event.type,
      severity: event.severity,
      timestamp: new Date(event.timestamp).toISOString(),
      blocked: event.blocked
    }))

    const healthResponse = {
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks,
      metrics: {
        totalEvents: metrics.totalEvents,
        blockedRequests: metrics.blockedRequests,
        uniqueIPs: metrics.uniqueIPs.size,
        eventsByType: metrics.eventsByType,
        eventsBySeverity: metrics.eventsBySeverity
      },
      recentEvents
    }

    const response = new Response(
      JSON.stringify(healthResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )

    return addAPISecurityHeaders(response)
    
  } catch (error) {
    console.error('Security health check error:', error)
    
    const response = new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        status: 'critical',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )

    return addAPISecurityHeaders(response)
  }
}

// Export the rate-limited handler
export { rateLimitedHandler as GET }