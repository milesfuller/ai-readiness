/**
 * Security Report API Endpoint
 * Generates detailed security reports for administrators
 */

import { NextRequest } from 'next/server'
import { securityMonitor } from '../../../../lib/security/monitoring'
import { addAPISecurityHeaders } from '../../../../lib/security/middleware'
import { withRateLimit, rateLimitConfigs } from '../../../../lib/security/rate-limiter'

// Rate limit this endpoint more strictly
const adminRateLimit = {
  ...rateLimitConfigs.api,
  maxRequests: 10, // Only 10 requests per 15 minutes
  message: 'Too many security report requests'
}

const rateLimitedHandler = withRateLimit(adminRateLimit)(handler)

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

    // Check authorization (you might want to add proper admin auth here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse query parameters for report customization
    const url = new URL(request.url)
    const timeWindow = parseInt(url.searchParams.get('hours') || '24') * 60 * 60 * 1000
    const format = url.searchParams.get('format') || 'json'
    const includeDetails = url.searchParams.get('details') === 'true'

    // Generate comprehensive security report
    const report = securityMonitor.generateSecurityReport(timeWindow)
    
    // Add additional details if requested
    if (includeDetails) {
      const allEvents = securityMonitor.getEvents(undefined, undefined, timeWindow, 1000)
      report.detailedEvents = allEvents.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        timestamp: new Date(event.timestamp).toISOString(),
        ip: event.ip,
        userAgent: event.userAgent,
        url: event.url,
        method: event.method,
        blocked: event.blocked,
        details: event.details
      }))
    }

    // Add system information
    report.systemInfo = {
      nodeEnv: process.env.NODE_ENV,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }

    let response: Response

    if (format === 'csv') {
      // Generate CSV format for events
      const events = report.recentEvents || []
      const csvHeader = 'Type,Severity,Timestamp,IP,URL,Blocked\n'
      const csvContent = events.map(event => 
        `${event.type},${event.severity},${event.timestamp},${event.ip},${event.url},${event.blocked}`
      ).join('\n')
      
      response = new Response(csvHeader + csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // JSON format
      response = new Response(
        JSON.stringify(report, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    return addAPISecurityHeaders(response)
    
  } catch (error) {
    console.error('Security report generation error:', error)
    
    const response = new Response(
      JSON.stringify({ 
        error: 'Internal server error',
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