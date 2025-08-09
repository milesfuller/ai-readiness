import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EmailTemplate, NotificationDeliveryResult } from '../types';
import { Logger } from '../utils/logger';
import { RedisService } from './redis-service';

export interface EmailServiceConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
  templatesPath: string;
  redis?: RedisService;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger: Logger;
  private redis?: RedisService;
  private config: EmailServiceConfig;
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.logger = new Logger('EmailService');
    this.redis = config.redis;

    this.transporter = nodemailer.createTransporter({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
      pool: true,
      maxConnections: 10,
      maxMessages: 100,
      rateLimit: 10, // 10 emails per second
    });

    this.registerHelpers();
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.info('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error);
      throw error;
    }
  }

  private registerHelpers(): void {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return d.toISOString();
    });

    // URL helper
    handlebars.registerHelper('buildUrl', (path: string, baseUrl?: string) => {
      const base = baseUrl || process.env.APP_BASE_URL || 'https://app.example.com';
      return `${base}${path.startsWith('/') ? path : '/' + path}`;
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Pluralization helper
    handlebars.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
      if (count === 1) return singular;
      return plural || `${singular}s`;
    });
  }

  async sendEmail(
    recipient: string,
    template: EmailTemplate,
    data: Record<string, any>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      retryCount?: number;
      scheduledAt?: Date;
    } = {}
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info(`Sending email to ${recipient} using template ${template.name}`);

      // Compile templates if not cached
      const subjectTemplate = await this.getCompiledTemplate(`${template.name}-subject`, template.subjectTemplate);
      const htmlTemplate = await this.getCompiledTemplate(`${template.name}-html`, template.htmlTemplate);
      const textTemplate = template.textTemplate 
        ? await this.getCompiledTemplate(`${template.name}-text`, template.textTemplate)
        : null;

      // Prepare template data with defaults
      const templateData = {
        ...data,
        timestamp: new Date(),
        year: new Date().getFullYear(),
        recipient: recipient,
        unsubscribeUrl: this.buildUnsubscribeUrl(recipient, template.categoryId),
        preferencesUrl: this.buildPreferencesUrl(recipient)
      };

      // Compile templates
      const subject = subjectTemplate(templateData);
      const html = htmlTemplate(templateData);
      const text = textTemplate ? textTemplate(templateData) : this.htmlToText(html);

      // Prepare mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: this.config.from.name,
          address: this.config.from.email
        },
        to: recipient,
        subject: subject,
        html: html,
        text: text,
        messageId: messageId,
        headers: {
          'X-Notification-ID': data.notificationId || 'unknown',
          'X-Template-Name': template.name,
          'X-Category': template.categoryId || 'general'
        }
      };

      // Add priority if specified
      if (options.priority === 'high') {
        mailOptions.priority = 'high';
        mailOptions.headers = {
          ...mailOptions.headers,
          'X-Priority': '1',
          'X-MSMail-Priority': 'High'
        };
      }

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      const processingTime = Date.now() - startTime;

      this.logger.info(`Email sent successfully`, {
        messageId: result.messageId,
        recipient,
        template: template.name,
        processingTime
      });

      // Cache successful send if Redis is available
      if (this.redis) {
        await this.cacheDeliveryResult(messageId, 'delivered', processingTime);
      }

      return {
        success: true,
        messageId: result.messageId,
        provider: 'smtp',
        processingTimeMs: processingTime,
        timestamp: new Date()
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Email sending failed`, {
        messageId,
        recipient,
        template: template.name,
        error: error.message,
        processingTime
      });

      // Cache failure if Redis is available
      if (this.redis) {
        await this.cacheDeliveryResult(messageId, 'failed', processingTime, error.message);
      }

      return {
        success: false,
        messageId,
        provider: 'smtp',
        processingTimeMs: processingTime,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  async sendBulkEmails(
    emails: Array<{
      recipient: string;
      template: EmailTemplate;
      data: Record<string, any>;
    }>,
    options: {
      batchSize?: number;
      delayMs?: number;
    } = {}
  ): Promise<NotificationDeliveryResult[]> {
    const { batchSize = 50, delayMs = 1000 } = options;
    const results: NotificationDeliveryResult[] = [];

    // Process in batches to avoid overwhelming the SMTP server
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email =>
        this.sendEmail(email.recipient, email.template, email.data)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            messageId: `batch-error-${Date.now()}`,
            provider: 'smtp',
            processingTimeMs: 0,
            timestamp: new Date(),
            error: result.reason
          });
        }
      }

      // Add delay between batches if not the last batch
      if (i + batchSize < emails.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.logger.info(`Bulk email sending completed`, {
      total: emails.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  private async getCompiledTemplate(
    key: string, 
    templateSource: string
  ): Promise<handlebars.TemplateDelegate> {
    if (this.templateCache.has(key)) {
      return this.templateCache.get(key)!;
    }

    const compiled = handlebars.compile(templateSource, {
      strict: true,
      noEscape: false
    });

    this.templateCache.set(key, compiled);
    return compiled;
  }

  private async loadTemplateFromFile(templatePath: string): Promise<string> {
    try {
      const fullPath = join(this.config.templatesPath, templatePath);
      return readFileSync(fullPath, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to load template file: ${templatePath}`, error);
      throw new Error(`Template file not found: ${templatePath}`);
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildUnsubscribeUrl(email: string, categoryId?: string): string {
    const baseUrl = process.env.APP_BASE_URL || 'https://app.example.com';
    const token = Buffer.from(JSON.stringify({ email, categoryId, timestamp: Date.now() })).toString('base64url');
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  private buildPreferencesUrl(email: string): string {
    const baseUrl = process.env.APP_BASE_URL || 'https://app.example.com';
    const token = Buffer.from(JSON.stringify({ email, timestamp: Date.now() })).toString('base64url');
    return `${baseUrl}/preferences?token=${token}`;
  }

  private async cacheDeliveryResult(
    messageId: string,
    status: string,
    processingTime: number,
    error?: string
  ): Promise<void> {
    if (!this.redis) return;

    const key = `email:delivery:${messageId}`;
    const data = {
      status,
      processingTime,
      timestamp: Date.now(),
      error: error || null
    };

    await this.redis.setex(key, 3600, JSON.stringify(data)); // Cache for 1 hour
  }

  async getDeliveryStatus(messageId: string): Promise<any | null> {
    if (!this.redis) return null;

    const key = `email:delivery:${messageId}`;
    const data = await this.redis.get(key);
    
    return data ? JSON.parse(data) : null;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP connection test failed', error);
      return false;
    }
  }

  async getStats(): Promise<{
    connectionPool: any;
    isConnected: boolean;
    templateCacheSize: number;
  }> {
    return {
      connectionPool: this.transporter.options,
      isConnected: await this.testConnection(),
      templateCacheSize: this.templateCache.size
    };
  }

  async close(): Promise<void> {
    this.transporter.close();
    this.templateCache.clear();
    this.logger.info('Email service closed');
  }
}