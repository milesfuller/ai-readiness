import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Index,
  BeforeCreate,
  BeforeUpdate,
  Unique
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import * as Handlebars from 'handlebars';

@Table({
  tableName: 'email_templates',
  timestamps: true,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['is_active'] },
    { fields: ['created_at'] }
  ]
})
export class EmailTemplate extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Index
  @Column(DataType.STRING(100))
  name!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  subject!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  htmlContent!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  textContent?: string;

  @AllowNull(false)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  variables!: string[];

  @AllowNull(false)
  @Default(true)
  @Index
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  category?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastUsedAt?: Date;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  usageCount!: number;

  @BeforeCreate
  @BeforeUpdate
  static validateTemplate(instance: EmailTemplate) {
    try {
      // Validate HTML content as valid Handlebars template
      Handlebars.compile(instance.htmlContent);
      
      // Validate subject as valid Handlebars template
      Handlebars.compile(instance.subject);
      
      // Validate text content if provided
      if (instance.textContent) {
        Handlebars.compile(instance.textContent);
      }
    } catch (error) {
      throw new Error(`Invalid Handlebars template: ${error.message}`);
    }

    // Extract variables from templates
    instance.variables = EmailTemplate.extractVariables(
      instance.htmlContent + ' ' + instance.subject + ' ' + (instance.textContent || '')
    );
  }

  // Instance methods
  public compile(data: Record<string, any> = {}): { subject: string; html: string; text?: string } {
    const subjectTemplate = Handlebars.compile(this.subject);
    const htmlTemplate = Handlebars.compile(this.htmlContent);
    
    const result: { subject: string; html: string; text?: string } = {
      subject: subjectTemplate(data),
      html: htmlTemplate(data)
    };

    if (this.textContent) {
      const textTemplate = Handlebars.compile(this.textContent);
      result.text = textTemplate(data);
    }

    return result;
  }

  public async incrementUsage(): Promise<void> {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
  }

  public getMissingVariables(data: Record<string, any>): string[] {
    const providedKeys = Object.keys(data);
    return this.variables.filter(variable => !providedKeys.includes(variable));
  }

  public hasRequiredVariables(data: Record<string, any>): boolean {
    return this.getMissingVariables(data).length === 0;
  }

  // Static methods
  static extractVariables(template: string): string[] {
    const variableRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      // Extract the variable name, handling nested properties
      const variable = match[1].split('.')[0];
      variables.add(variable);
    }

    return Array.from(variables);
  }

  static async findByName(name: string): Promise<EmailTemplate | null> {
    return this.findOne({
      where: { name, isActive: true }
    });
  }

  static async findActiveTemplates(): Promise<EmailTemplate[]> {
    return this.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
  }

  static async findByCategory(category: string): Promise<EmailTemplate[]> {
    return this.findAll({
      where: { category, isActive: true },
      order: [['name', 'ASC']]
    });
  }

  static async getUsageStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    
    if (startDate || endDate) {
      whereClause.lastUsedAt = {};
      if (startDate) {
        whereClause.lastUsedAt[require('sequelize').Op.gte] = startDate;
      }
      if (endDate) {
        whereClause.lastUsedAt[require('sequelize').Op.lte] = endDate;
      }
    }

    return this.findAll({
      where: whereClause,
      attributes: ['name', 'usageCount', 'lastUsedAt'],
      order: [['usageCount', 'DESC']]
    });
  }

  static async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'welcome',
        subject: 'Welcome to {{appName}}!',
        htmlContent: `
          <html>
            <body>
              <h1>Welcome {{userName}}!</h1>
              <p>Thank you for joining {{appName}}. We're excited to have you on board.</p>
              <p>Get started by exploring our features and setting up your profile.</p>
              <a href="{{dashboardUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Go to Dashboard
              </a>
            </body>
          </html>
        `,
        textContent: 'Welcome {{userName}}! Thank you for joining {{appName}}. Visit {{dashboardUrl}} to get started.',
        variables: ['appName', 'userName', 'dashboardUrl'],
        category: 'onboarding'
      },
      {
        name: 'password-reset',
        subject: 'Reset your password for {{appName}}',
        htmlContent: `
          <html>
            <body>
              <h1>Password Reset Request</h1>
              <p>Hi {{userName}},</p>
              <p>You requested to reset your password. Click the link below to set a new password:</p>
              <a href="{{resetUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Reset Password
              </a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </body>
          </html>
        `,
        textContent: 'Hi {{userName}}, reset your password by visiting: {{resetUrl}}',
        variables: ['appName', 'userName', 'resetUrl'],
        category: 'security'
      },
      {
        name: 'notification-digest',
        subject: 'Your daily digest from {{appName}}',
        htmlContent: `
          <html>
            <body>
              <h1>Daily Digest</h1>
              <p>Hi {{userName}},</p>
              <p>Here's what happened while you were away:</p>
              {{#each notifications}}
                <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 10px 0;">
                  <h3>{{title}}</h3>
                  <p>{{message}}</p>
                  <small>{{timestamp}}</small>
                </div>
              {{/each}}
              <a href="{{dashboardUrl}}">View all notifications</a>
            </body>
          </html>
        `,
        textContent: 'Hi {{userName}}, check your daily digest at {{dashboardUrl}}',
        variables: ['appName', 'userName', 'notifications', 'dashboardUrl'],
        category: 'digest'
      }
    ];

    for (const template of defaultTemplates) {
      await this.findOrCreate({
        where: { name: template.name },
        defaults: template
      });
    }
  }
}