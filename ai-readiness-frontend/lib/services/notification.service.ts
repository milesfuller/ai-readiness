import { createServerSupabaseClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { render } from '@react-email/render'
import * as emailTemplates from '@/lib/email/templates'

// Notification types
export enum NotificationType {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationCategory {
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  SURVEY = 'SURVEY',
  REPORT = 'REPORT',
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  BILLING = 'BILLING'
}

// Notification schemas
const notificationSchema = z.object({
  userId: z.string(),
  type: z.nativeEnum(NotificationType),
  category: z.nativeEnum(NotificationCategory),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
  subject: z.string(),
  message: z.string(),
  metadata: z.record(z.any()).optional(),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  expiresAt: z.date().optional(),
  scheduledFor: z.date().optional()
})

const emailNotificationSchema = notificationSchema.extend({
  templateName: z.string(),
  templateData: z.record(z.any()),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.any(),
    contentType: z.string()
  })).optional()
})

const bulkNotificationSchema = z.object({
  userIds: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  notification: notificationSchema
})

export type Notification = z.infer<typeof notificationSchema>
export type EmailNotification = z.infer<typeof emailNotificationSchema>
export type BulkNotification = z.infer<typeof bulkNotificationSchema>

/**
 * Notification Service
 * Handles all notification operations including email, in-app, and push notifications
 */
export class NotificationService {
  private transporter: nodemailer.Transporter | null = null
  private supabase: any
  private wsConnections: Map<string, WebSocket> = new Map()

  constructor() {
    this.initializeEmailTransporter()
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    this.supabase = await createServerSupabaseClient()
  }

  private initializeEmailTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransporter(emailConfig)
    } else {
      console.warn('Email service not configured - email notifications will be disabled')
    }
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(notification: Notification): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = notificationSchema.parse(notification)
      
      // Check user preferences
      const preferences = await this.getUserPreferences(validation.userId)
      
      if (!this.shouldSendNotification(validation, preferences)) {
        return { success: false, error: 'Notification blocked by user preferences' }
      }

      // Store notification in database
      const { data: savedNotification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: validation.userId,
          type: validation.type,
          category: validation.category,
          priority: validation.priority,
          subject: validation.subject,
          message: validation.message,
          metadata: validation.metadata,
          action_url: validation.actionUrl,
          action_label: validation.actionLabel,
          expires_at: validation.expiresAt,
          scheduled_for: validation.scheduledFor,
          sent_at: validation.scheduledFor ? null : new Date(),
          is_read: false
        })
        .select()
        .single()

      if (error) throw error

      // Send based on type
      switch (validation.type) {
        case NotificationType.EMAIL:
          await this.sendEmailNotification(validation)
          break
        case NotificationType.IN_APP:
          await this.sendInAppNotification(validation)
          break
        case NotificationType.PUSH:
          await this.sendPushNotification(validation)
          break
        case NotificationType.SMS:
          await this.sendSMSNotification(validation)
          break
      }

      return { success: true, id: savedNotification.id }
    } catch (error) {
      console.error('Failed to send notification:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: EmailNotification) {
    if (!this.transporter) {
      console.warn('Email transporter not configured')
      return
    }

    try {
      // Get user email
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', notification.userId)
        .single()

      if (!user) throw new Error('User not found')

      // Render email template
      const template = emailTemplates[notification.templateName as keyof typeof emailTemplates]
      if (!template) throw new Error(`Email template ${notification.templateName} not found`)

      const emailHtml = render(template({
        ...notification.templateData,
        userName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        subject: notification.subject,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel
      }))

      // Send email
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'AI Readiness'} <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
        to: user.email,
        subject: notification.subject,
        html: emailHtml,
        attachments: notification.attachments
      }

      await this.transporter.sendMail(mailOptions)

      // Update notification status
      await this.supabase
        .from('notifications')
        .update({ 
          sent_at: new Date(),
          delivery_status: 'sent'
        })
        .eq('id', notification.userId)

    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  /**
   * Send in-app notification via WebSocket
   */
  private async sendInAppNotification(notification: Notification) {
    try {
      // Send via WebSocket if user is connected
      const ws = this.wsConnections.get(notification.userId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'notification',
          data: {
            id: notification.userId,
            category: notification.category,
            priority: notification.priority,
            subject: notification.subject,
            message: notification.message,
            actionUrl: notification.actionUrl,
            actionLabel: notification.actionLabel,
            timestamp: new Date()
          }
        }))
      }

      // Also broadcast via Supabase realtime
      await this.supabase
        .from('realtime_notifications')
        .insert({
          user_id: notification.userId,
          payload: notification,
          created_at: new Date()
        })

    } catch (error) {
      console.error('Failed to send in-app notification:', error)
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private async sendPushNotification(notification: Notification) {
    // TODO: Implement push notifications using FCM or similar service
    console.log('Push notification not yet implemented:', notification)
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   */
  private async sendSMSNotification(notification: Notification) {
    // TODO: Implement SMS notifications using Twilio or similar service
    console.log('SMS notification not yet implemented:', notification)
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(bulk: BulkNotification): Promise<{ success: number; failed: number; errors: string[] }> {
    const validation = bulkNotificationSchema.parse(bulk)
    const results = { success: 0, failed: 0, errors: [] as string[] }

    try {
      // Get target users
      let query = this.supabase.from('users').select('id')

      if (validation.userIds) {
        query = query.in('id', validation.userIds)
      }
      if (validation.roles) {
        query = query.in('role', validation.roles)
      }
      if (validation.organizationId) {
        query = query.eq('organization_id', validation.organizationId)
      }

      const { data: users, error } = await query
      if (error) throw error

      // Send notifications in parallel
      const promises = users.map(user => 
        this.sendNotification({
          ...validation.notification,
          userId: user.id
        })
      )

      const responses = await Promise.allSettled(promises)
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.success) {
          results.success++
        } else {
          results.failed++
          if (response.status === 'rejected') {
            results.errors.push(`User ${users[index].id}: ${response.reason}`)
          } else if (response.status === 'fulfilled' && response.value.error) {
            results.errors.push(`User ${users[index].id}: ${response.value.error}`)
          }
        }
      })

      return results
    } catch (error) {
      console.error('Failed to send bulk notifications:', error)
      return {
        success: 0,
        failed: validation.userIds?.length || 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Return defaults if no preferences found
      return data || {
        email_enabled: true,
        in_app_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        categories: Object.values(NotificationCategory),
        quiet_hours_start: null,
        quiet_hours_end: null,
        frequency: 'instant' // instant, digest_daily, digest_weekly
      }
    } catch (error) {
      console.error('Failed to get user preferences:', error)
      return {}
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date()
        })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(notification: Notification, preferences: any): boolean {
    // Check if notification type is enabled
    const typeKey = `${notification.type.toLowerCase()}_enabled`
    if (preferences[typeKey] === false) return false

    // Check category preferences
    if (preferences.categories && !preferences.categories.includes(notification.category)) {
      return false
    }

    // Check quiet hours
    if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date()
      const currentHour = now.getHours()
      const startHour = parseInt(preferences.quiet_hours_start)
      const endHour = parseInt(preferences.quiet_hours_end)

      if (startHour <= endHour) {
        if (currentHour >= startHour && currentHour < endHour) return false
      } else {
        if (currentHour >= startHour || currentHour < endHour) return false
      }
    }

    // Check priority threshold
    if (preferences.min_priority) {
      const priorities = Object.values(NotificationPriority)
      const notificationPriority = priorities.indexOf(notification.priority)
      const minPriority = priorities.indexOf(preferences.min_priority)
      
      if (notificationPriority < minPriority) return false
    }

    return true
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      return { success: false }
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      category?: NotificationCategory
      priority?: NotificationPriority
    } = {}
  ) {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50)

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      if (options.unreadOnly) {
        query = query.eq('is_read', false)
      }

      if (options.category) {
        query = query.eq('category', options.category)
      }

      if (options.priority) {
        query = query.eq('priority', options.priority)
      }

      const { data, error } = await query

      if (error) throw error

      return { success: true, notifications: data }
    } catch (error) {
      console.error('Failed to get notifications:', error)
      return { success: false, notifications: [] }
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      return { success: false }
    }
  }

  /**
   * Register WebSocket connection for real-time notifications
   */
  registerWebSocket(userId: string, ws: WebSocket) {
    this.wsConnections.set(userId, ws)
    
    ws.on('close', () => {
      this.wsConnections.delete(userId)
    })
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string, type: NotificationType): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      userId,
      type,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.LOW,
      subject: 'Test Notification',
      message: `This is a test ${type.toLowerCase()} notification to verify your notification settings.`,
      actionUrl: '/settings/notifications',
      actionLabel: 'View Settings'
    })
  }
}

// Singleton instance
let notificationService: NotificationService | null = null

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService()
  }
  return notificationService
}

export default NotificationService