/**
 * Email Service for Invitation Management
 * Handles email sending, templates, and tracking
 */

import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/client'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface InvitationData {
  email: string
  organizationId: string
  role: 'user' | 'org_admin'
  invitedBy: string
  firstName?: string
  lastName?: string
  message?: string
}

export interface EmailTrackingData {
  id: string
  email: string
  type: 'invitation' | 'reminder' | 'welcome'
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed'
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  error?: string
  metadata: Record<string, any>
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private supabase = createClient()
  
  constructor() {
    this.initializeTransporter()
  }

  private async initializeTransporter(): Promise<void> {
    const emailConfig = this.getEmailConfig()
    
    if (!emailConfig) {
      console.warn('[Email Service] Email configuration not available. Using fallback mode.')
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // 14 emails per second max
      })

      // Verify connection
      await this.transporter.verify()
      console.log('[Email Service] SMTP connection verified successfully')
    } catch (error) {
      console.error('[Email Service] SMTP configuration failed:', error)
      this.transporter = null
    }
  }

  private getEmailConfig(): EmailConfig | null {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      return null
    }

    return {
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    }
  }

  /**
   * Generate secure invitation token
   */
  generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Send invitation email
   */
  async sendInvitation(invitationData: InvitationData): Promise<{ success: boolean; error?: string; trackingId?: string }> {
    try {
      // Generate invitation token
      const token = this.generateInvitationToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      
      // Store invitation in database
      const { data: invitation, error: dbError } = await this.supabase
        .from('invitations')
        .insert([{
          email: invitationData.email,
          token,
          organization_id: invitationData.organizationId,
          role: invitationData.role,
          invited_by: invitationData.invitedBy,
          expires_at: expiresAt.toISOString(),
          first_name: invitationData.firstName,
          last_name: invitationData.lastName,
          custom_message: invitationData.message,
          status: 'pending'
        }])
        .select()
        .single()

      if (dbError) {
        console.error('[Email Service] Database error storing invitation:', dbError)
        return { success: false, error: 'Failed to create invitation' }
      }

      // Create tracking record
      const trackingId = crypto.randomUUID()
      await this.createEmailTracking(trackingId, invitationData.email, 'invitation', {
        invitationId: invitation.id,
        organizationId: invitationData.organizationId,
        role: invitationData.role
      })

      if (!this.transporter) {
        // Fallback: Create a manual invitation link for admin
        const fallbackLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation/${token}`
        console.warn('[Email Service] No email transport available. Manual invitation link:', fallbackLink)
        
        // Update tracking as failed but with fallback info
        await this.updateEmailTracking(trackingId, 'failed', {
          error: 'No email service configured',
          fallbackLink
        })

        return { 
          success: false, 
          error: 'Email service not configured. Please share this link manually: ' + fallbackLink,
          trackingId
        }
      }

      // Generate email template
      const template = await this.generateInvitationTemplate(invitationData, token)
      
      // Send email
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: invitationData.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'X-Tracking-ID': trackingId,
          'X-Invitation-ID': invitation.id
        }
      })

      // Update tracking as sent
      await this.updateEmailTracking(trackingId, 'sent', {
        messageId: info.messageId,
        response: info.response
      })

      console.log('[Email Service] Invitation sent successfully:', {
        email: invitationData.email,
        messageId: info.messageId,
        trackingId
      })

      return { success: true, trackingId }
    } catch (error) {
      console.error('[Email Service] Error sending invitation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Generate invitation email template
   */
  private async generateInvitationTemplate(
    invitationData: InvitationData,
    token: string
  ): Promise<EmailTemplate> {
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation/${token}`
    const organizationName = await this.getOrganizationName(invitationData.organizationId)
    const inviterName = await this.getInviterName(invitationData.invitedBy)
    
    const recipientName = invitationData.firstName 
      ? `${invitationData.firstName} ${invitationData.lastName || ''}`.trim()
      : invitationData.email

    const subject = `You're invited to join ${organizationName} on AI Readiness Platform`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to ${organizationName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; margin-bottom: 20px; color: #1f2937; }
    .message { margin-bottom: 30px; color: #4b5563; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .details h3 { margin: 0 0 15px 0; color: #1f2937; font-size: 16px; }
    .details p { margin: 5px 0; color: #6b7280; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
    .footer a { color: #14b8a6; text-decoration: none; }
    .security-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .security-note p { margin: 0; color: #92400e; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 You're Invited!</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Hi ${recipientName},</div>
      
      <div class="message">
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on the AI Readiness Platform.</p>
        ${invitationData.message ? `<p><em>"${invitationData.message}"</em></p>` : ''}
        <p>The AI Readiness Platform helps organizations assess and improve their AI capabilities through comprehensive surveys and analytics.</p>
      </div>

      <div style="text-align: center;">
        <a href="${acceptUrl}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="details">
        <h3>Invitation Details</h3>
        <p><strong>Organization:</strong> ${organizationName}</p>
        <p><strong>Role:</strong> ${invitationData.role === 'org_admin' ? 'Organization Administrator' : 'User'}</p>
        <p><strong>Invited by:</strong> ${inviterName}</p>
        <p><strong>Expires:</strong> 7 days from now</p>
      </div>

      <div class="security-note">
        <p><strong>Security Note:</strong> This invitation link is valid for 7 days and can only be used once. If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    </div>

    <div class="footer">
      <p>© 2024 AI Readiness Platform. All rights reserved.</p>
      <p>If you have any questions, please contact <a href="mailto:support@ai-readiness.com">support@ai-readiness.com</a></p>
      <p style="font-size: 12px; margin-top: 20px;">
        If the button above doesn't work, copy and paste this link into your browser:<br>
        <a href="${acceptUrl}">${acceptUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`

    const text = `
Hi ${recipientName},

${inviterName} has invited you to join ${organizationName} on the AI Readiness Platform.

${invitationData.message ? `Personal message: "${invitationData.message}"` : ''}

The AI Readiness Platform helps organizations assess and improve their AI capabilities through comprehensive surveys and analytics.

To accept this invitation, click the link below or copy it into your browser:
${acceptUrl}

Invitation Details:
- Organization: ${organizationName}
- Role: ${invitationData.role === 'org_admin' ? 'Organization Administrator' : 'User'}
- Invited by: ${inviterName}
- Expires: 7 days from now

Security Note: This invitation link is valid for 7 days and can only be used once. If you didn't expect this invitation, you can safely ignore this email.

© 2024 AI Readiness Platform. All rights reserved.
If you have any questions, please contact support@ai-readiness.com
`

    return { subject, html, text }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (invitation.status === 'accepted') {
        return { success: false, error: 'Invitation already accepted' }
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return { success: false, error: 'Invitation expired' }
      }

      // Resend with same token
      const invitationData: InvitationData = {
        email: invitation.email,
        organizationId: invitation.organization_id,
        role: invitation.role,
        invitedBy: invitation.invited_by,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        message: invitation.custom_message
      }

      if (!this.transporter) {
        const fallbackLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation/${invitation.token}`
        return { 
          success: false, 
          error: 'Email service not configured. Manual link: ' + fallbackLink 
        }
      }

      const template = await this.generateInvitationTemplate(invitationData, invitation.token)
      
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: invitation.email,
        subject: `[Reminder] ${template.subject}`,
        text: template.text,
        html: template.html
      })

      // Update invitation status
      await this.supabase
        .from('invitations')
        .update({ 
          resent_count: (invitation.resent_count || 0) + 1,
          last_sent_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      console.log('[Email Service] Invitation resent successfully:', {
        invitationId,
        email: invitation.email,
        messageId: info.messageId
      })

      return { success: true }
    } catch (error) {
      console.error('[Email Service] Error resending invitation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Create email tracking record
   */
  private async createEmailTracking(
    id: string, 
    email: string, 
    type: EmailTrackingData['type'], 
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('email_tracking')
        .insert([{
          id,
          email,
          type,
          status: 'pending',
          metadata,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('[Email Service] Error creating email tracking:', error)
    }
  }

  /**
   * Update email tracking status
   */
  private async updateEmailTracking(
    trackingId: string, 
    status: EmailTrackingData['status'], 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const updateData: any = { status }
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString()
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      } else if (status === 'opened') {
        updateData.opened_at = new Date().toISOString()
      }

      if (metadata) {
        updateData.metadata = metadata
      }

      await this.supabase
        .from('email_tracking')
        .update(updateData)
        .eq('id', trackingId)
    } catch (error) {
      console.error('[Email Service] Error updating email tracking:', error)
    }
  }

  /**
   * Get organization name
   */
  private async getOrganizationName(organizationId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

      if (error || !data) {
        return 'AI Readiness Platform'
      }

      return data.name
    } catch {
      return 'AI Readiness Platform'
    }
  }

  /**
   * Get inviter name
   */
  private async getInviterName(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return 'Team Administrator'
      }

      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim()
      return fullName || data.email || 'Team Administrator'
    } catch {
      return 'Team Administrator'
    }
  }

  /**
   * Validate invitation token
   */
  async validateInvitation(token: string): Promise<{
    valid: boolean
    invitation?: any
    error?: string
  }> {
    try {
      const { data: invitation, error } = await this.supabase
        .from('invitations')
        .select(`
          *,
          organizations (name),
          profiles (first_name, last_name, email)
        `)
        .eq('token', token)
        .single()

      if (error || !invitation) {
        return { valid: false, error: 'Invalid invitation token' }
      }

      if (invitation.status === 'accepted') {
        return { valid: false, error: 'Invitation already accepted' }
      }

      if (invitation.status === 'cancelled') {
        return { valid: false, error: 'Invitation has been cancelled' }
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return { valid: false, error: 'Invitation has expired' }
      }

      return { valid: true, invitation }
    } catch (error) {
      console.error('[Email Service] Error validating invitation:', error)
      return { valid: false, error: 'Error validating invitation' }
    }
  }

  /**
   * Accept invitation and create user
   */
  async acceptInvitation(token: string, password: string): Promise<{
    success: boolean
    user?: any
    error?: string
  }> {
    try {
      // Validate invitation first
      const validation = await this.validateInvitation(token)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      const invitation = validation.invitation!

      // Create user account
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            firstName: invitation.first_name,
            lastName: invitation.last_name,
            organizationId: invitation.organization_id,
            role: invitation.role,
            invitedBy: invitation.invited_by
          }
        }
      })

      if (authError) {
        console.error('[Email Service] Auth error during invitation acceptance:', authError)
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      // Mark invitation as accepted
      await this.supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: authData.user.id
        })
        .eq('token', token)

      // Create profile
      await this.supabase
        .from('profiles')
        .insert([{
          user_id: authData.user.id,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          organization_id: invitation.organization_id
        }])

      // Add user to organization
      await this.supabase
        .from('organization_members')
        .insert([{
          organization_id: invitation.organization_id,
          user_id: authData.user.id,
          role: invitation.role,
          joined_at: new Date().toISOString()
        }])

      console.log('[Email Service] Invitation accepted successfully:', {
        email: invitation.email,
        userId: authData.user.id,
        organizationId: invitation.organization_id
      })

      return { success: true, user: authData.user }
    } catch (error) {
      console.error('[Email Service] Error accepting invitation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get invitation statistics for admin
   */
  async getInvitationStats(organizationId?: string): Promise<{
    total: number
    pending: number
    accepted: number
    expired: number
    recent: any[]
  }> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('*')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: invitations, error } = await query
        .order('created_at', { ascending: false })

      if (error || !invitations) {
        return { total: 0, pending: 0, accepted: 0, expired: 0, recent: [] }
      }

      const now = new Date()
      const stats = {
        total: invitations.length,
        pending: invitations.filter(i => i.status === 'pending' && new Date(i.expires_at) > now).length,
        accepted: invitations.filter(i => i.status === 'accepted').length,
        expired: invitations.filter(i => i.status === 'pending' && new Date(i.expires_at) <= now).length,
        recent: invitations.slice(0, 10)
      }

      return stats
    } catch (error) {
      console.error('[Email Service] Error getting invitation stats:', error)
      return { total: 0, pending: 0, accepted: 0, expired: 0, recent: [] }
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('invitations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', invitationId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('[Email Service] Error cancelling invitation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Clean up expired invitations (cron job helper)
   */
  async cleanupExpiredInvitations(): Promise<{ cleaned: number; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        return { cleaned: 0, error: error.message }
      }

      console.log(`[Email Service] Cleaned up ${data?.length || 0} expired invitations`)
      return { cleaned: data?.length || 0 }
    } catch (error) {
      console.error('[Email Service] Error cleaning up expired invitations:', error)
      return { 
        cleaned: 0, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()
export default emailService