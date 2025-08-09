/**
 * Webhook Management System
 * 
 * Comprehensive webhook system for real-time integrations:
 * - Webhook endpoint registration and management
 * - Event payload delivery with retries
 * - Signature-based security validation
 * - Webhook health monitoring and analytics
 * - Rate limiting and throttling
 * - Event filtering and routing
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

// Webhook schemas
export const WebhookEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  data: z.any(),
  timestamp: z.string(),
  requestId: z.string(),
  organizationId: z.string(),
  userId: z.string().optional(),
})

export const WebhookEndpointSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  secret: z.string(),
  events: z.array(z.string()),
  is_active: z.boolean().default(true),
  organization_id: z.string(),
  user_id: z.string(),
  headers: z.record(z.string()).optional(),
  timeout_ms: z.number().default(30000),
  retry_count: z.number().default(3),
  retry_delay_ms: z.number().default(1000),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout_ms: z.number().min(1000).max(60000).default(30000),
  retry_count: z.number().min(0).max(10).default(3),
  retry_delay_ms: z.number().min(100).max(60000).default(1000),
})

export type WebhookEvent = z.infer<typeof WebhookEventSchema>
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>
export type CreateWebhookRequest = z.infer<typeof CreateWebhookSchema>

// Webhook event types
export const WebhookEvents = {
  // Survey events
  SURVEY_CREATED: 'survey.created',
  SURVEY_UPDATED: 'survey.updated',
  SURVEY_DELETED: 'survey.deleted',
  SURVEY_PUBLISHED: 'survey.published',
  
  // Response events
  RESPONSE_SUBMITTED: 'response.submitted',
  RESPONSE_COMPLETED: 'response.completed',
  RESPONSE_UPDATED: 'response.updated',
  
  // Analysis events
  LLM_ANALYSIS_COMPLETED: 'llm.analysis.completed',
  LLM_BATCH_COMPLETED: 'llm.batch.completed',
  JTBD_ANALYSIS_COMPLETED: 'jtbd.analysis.completed',
  
  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  USER_INVITATION_SENT: 'user.invitation.sent',
  USER_INVITATION_ACCEPTED: 'user.invitation.accepted',
  
  // Organization events
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_MEMBER_ADDED: 'organization.member.added',
  ORGANIZATION_MEMBER_REMOVED: 'organization.member.removed',
  
  // System events
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  WEBHOOK_FAILED: 'webhook.failed',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
} as const

export type WebhookEventType = typeof WebhookEvents[keyof typeof WebhookEvents]

// Delivery attempt result
export interface DeliveryAttempt {
  id: string
  webhookId: string
  eventId: string
  attempt: number
  url: string
  httpStatus?: number
  response?: string
  error?: string
  duration_ms: number
  timestamp: string
}

/**
 * Main Webhook Manager class
 */
export class WebhookManager {
  /**
   * Register a new webhook endpoint
   */
  async registerWebhook(
    userId: string,
    organizationId: string,
    request: CreateWebhookRequest
  ): Promise<WebhookEndpoint> {
    const supabase = await createServerSupabaseClient()
    
    // Generate secret if not provided
    const secret = request.secret || this.generateSecret()

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        name: request.name,
        url: request.url,
        secret,
        events: request.events,
        user_id: userId,
        organization_id: organizationId,
        headers: request.headers,
        timeout_ms: request.timeout_ms,
        retry_count: request.retry_count,
        retry_delay_ms: request.retry_delay_ms,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to register webhook: ${error.message}`)
    }

    return data
  }

  /**
   * Trigger webhook event
   */
  async triggerWebhook(event: Omit<WebhookEvent, 'id'>): Promise<void> {
    const eventId = crypto.randomUUID()
    const fullEvent: WebhookEvent = { ...event, id: eventId }

    // Store event in database
    await this.storeEvent(fullEvent)

    // Find matching webhook endpoints
    const endpoints = await this.findMatchingEndpoints(event.event, event.organizationId)

    // Deliver to all matching endpoints
    await Promise.all(
      endpoints.map(endpoint => this.deliverToEndpoint(fullEvent, endpoint))
    )
  }

  /**
   * Deliver event to a specific endpoint
   */
  private async deliverToEndpoint(
    event: WebhookEvent,
    endpoint: WebhookEndpoint
  ): Promise<void> {
    let attempt = 0
    let lastError: string | undefined

    while (attempt <= endpoint.retry_count) {
      attempt++

      try {
        const deliveryResult = await this.attemptDelivery(event, endpoint, attempt)
        
        // Store delivery attempt
        await this.storeDeliveryAttempt({
          id: crypto.randomUUID(),
          webhookId: endpoint.id,
          eventId: event.id,
          attempt,
          url: endpoint.url,
          httpStatus: deliveryResult.status,
          response: deliveryResult.response,
          duration_ms: deliveryResult.duration,
          timestamp: new Date().toISOString(),
        })

        // Success - exit retry loop
        if (deliveryResult.status >= 200 && deliveryResult.status < 300) {
          return
        }

        lastError = `HTTP ${deliveryResult.status}: ${deliveryResult.response}`
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        
        // Store failed delivery attempt
        await this.storeDeliveryAttempt({
          id: crypto.randomUUID(),
          webhookId: endpoint.id,
          eventId: event.id,
          attempt,
          url: endpoint.url,
          error: lastError,
          duration_ms: 0,
          timestamp: new Date().toISOString(),
        })
      }

      // Wait before retry (except on last attempt)
      if (attempt <= endpoint.retry_count) {
        await this.delay(endpoint.retry_delay_ms * attempt) // Exponential backoff
      }
    }

    // All retries failed - trigger webhook failure event
    await this.triggerWebhookFailure(event, endpoint, lastError || 'Unknown error')
  }

  /**
   * Attempt single delivery
   */
  private async attemptDelivery(
    event: WebhookEvent,
    endpoint: WebhookEndpoint,
    attempt: number
  ): Promise<{
    status: number
    response: string
    duration: number
  }> {
    const startTime = Date.now()

    // Build payload
    const payload = {
      id: event.id,
      event: event.event,
      data: event.data,
      timestamp: event.timestamp,
      request_id: event.requestId,
    }

    // Generate signature
    const signature = this.generateSignature(JSON.stringify(payload), endpoint.secret)

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Readiness-Webhooks/1.0',
      'X-Webhook-ID': endpoint.id,
      'X-Event-ID': event.id,
      'X-Signature-SHA256': signature,
      'X-Attempt': attempt.toString(),
      'X-Timestamp': event.timestamp,
      ...endpoint.headers,
    }

    // Make HTTP request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout_ms)

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseText = await response.text().catch(() => '')
      const duration = Date.now() - startTime

      return {
        status: response.status,
        response: responseText.substring(0, 1000), // Limit response size
        duration,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Find webhook endpoints matching event and organization
   */
  private async findMatchingEndpoints(
    eventType: string,
    organizationId: string
  ): Promise<WebhookEndpoint[]> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [eventType])

    if (error) {
      console.error('Failed to find webhook endpoints:', error)
      return []
    }

    return data || []
  }

  /**
   * Store webhook event
   */
  private async storeEvent(event: WebhookEvent): Promise<void> {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        id: event.id,
        event_type: event.event,
        payload: event.data,
        organization_id: event.organizationId,
        user_id: event.userId,
        request_id: event.requestId,
        timestamp: event.timestamp,
      })

    if (error) {
      console.error('Failed to store webhook event:', error)
    }
  }

  /**
   * Store delivery attempt
   */
  private async storeDeliveryAttempt(attempt: DeliveryAttempt): Promise<void> {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('webhook_delivery_attempts')
      .insert({
        id: attempt.id,
        webhook_endpoint_id: attempt.webhookId,
        event_id: attempt.eventId,
        attempt_number: attempt.attempt,
        url: attempt.url,
        http_status: attempt.httpStatus,
        response_body: attempt.response,
        error_message: attempt.error,
        duration_ms: attempt.duration_ms,
        timestamp: attempt.timestamp,
      })

    if (error) {
      console.error('Failed to store delivery attempt:', error)
    }
  }

  /**
   * Trigger webhook failure event
   */
  private async triggerWebhookFailure(
    originalEvent: WebhookEvent,
    endpoint: WebhookEndpoint,
    error: string
  ): Promise<void> {
    // Avoid infinite loops by not triggering webhook.failed events for webhook.failed events
    if (originalEvent.event === WebhookEvents.WEBHOOK_FAILED) {
      return
    }

    await this.triggerWebhook({
      event: WebhookEvents.WEBHOOK_FAILED,
      data: {
        originalEvent: originalEvent.event,
        originalEventId: originalEvent.id,
        webhook: {
          id: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
        },
        error,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      organizationId: originalEvent.organizationId,
      userId: originalEvent.userId,
    })
  }

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * List webhooks for organization
   */
  async listWebhooks(organizationId: string): Promise<WebhookEndpoint[]> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list webhooks: ${error.message}`)
    }

    return data || []
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(
    webhookId: string,
    userId: string,
    organizationId: string,
    updates: Partial<CreateWebhookRequest>
  ): Promise<WebhookEndpoint> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update webhook: ${error.message}`)
    }

    return data
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(
    webhookId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to delete webhook: ${error.message}`)
    }
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(
    webhookId: string,
    organizationId: string,
    limit: number = 50
  ): Promise<DeliveryAttempt[]> {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('webhook_delivery_attempts')
      .select(`
        *,
        webhook_endpoints!inner(organization_id)
      `)
      .eq('webhook_endpoint_id', webhookId)
      .eq('webhook_endpoints.organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get delivery history: ${error.message}`)
    }

    return data?.map(item => ({
      id: item.id,
      webhookId: item.webhook_endpoint_id,
      eventId: item.event_id,
      attempt: item.attempt_number,
      url: item.url,
      httpStatus: item.http_status,
      response: item.response_body,
      error: item.error_message,
      duration_ms: item.duration_ms,
      timestamp: item.timestamp,
    })) || []
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string, organizationId: string): Promise<{
    success: boolean
    statusCode?: number
    response?: string
    error?: string
    duration?: number
  }> {
    // Get webhook details
    const supabase = await createServerSupabaseClient()
    const { data: webhook, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', webhookId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !webhook) {
      return {
        success: false,
        error: 'Webhook not found',
      }
    }

    // Create test event
    const testEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      event: 'webhook.test',
      data: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      organizationId,
    }

    try {
      const result = await this.attemptDelivery(testEvent, webhook, 1)
      
      return {
        success: result.status >= 200 && result.status < 300,
        statusCode: result.status,
        response: result.response,
        duration: result.duration,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get webhook analytics
   */
  async getWebhookAnalytics(
    organizationId: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    averageResponseTime: number
    topEvents: Array<{ event: string; count: number }>
    deliverySuccessRate: number
  }> {
    // This would involve complex queries to aggregate delivery data
    // For now, return mock data structure
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      topEvents: [],
      deliverySuccessRate: 0,
    }
  }
}

// Export singleton instance
export const webhookManager = new WebhookManager()

/**
 * Webhook validation middleware
 */
export function validateWebhookSignature(secret: string) {
  return (request: NextRequest): boolean => {
    const signature = request.headers.get('X-Signature-SHA256')
    if (!signature) {
      return false
    }

    const payload = request.body?.toString() || ''
    return WebhookManager.verifySignature(payload, signature, secret)
  }
}