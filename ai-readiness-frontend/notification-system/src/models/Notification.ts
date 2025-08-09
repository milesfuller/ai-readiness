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
  HasMany
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType, NotificationPriority, NotificationChannel, NotificationStatus } from '../types';
import { NotificationDelivery } from './NotificationDelivery';

@Table({
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['scheduled_at'] },
    { fields: ['expires_at'] },
    { fields: ['created_at'] }
  ]
})
export class Notification extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.ENUM(...Object.values(NotificationType)))
  type!: NotificationType;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message!: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  data?: Record<string, any>;

  @AllowNull(false)
  @Default(NotificationPriority.MEDIUM)
  @Index
  @Column(DataType.ENUM(...Object.values(NotificationPriority)))
  priority!: NotificationPriority;

  @AllowNull(false)
  @Column(DataType.ARRAY(DataType.ENUM(...Object.values(NotificationChannel))))
  channels!: NotificationChannel[];

  @AllowNull(false)
  @Default(NotificationStatus.PENDING)
  @Index
  @Column(DataType.ENUM(...Object.values(NotificationStatus)))
  status!: NotificationStatus;

  @AllowNull(true)
  @Index
  @Column(DataType.DATE)
  scheduledAt?: Date;

  @AllowNull(true)
  @Index
  @Column(DataType.DATE)
  expiresAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  readAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  deliveredAt?: Date;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  attempts!: number;

  @AllowNull(false)
  @Default(3)
  @Column(DataType.INTEGER)
  maxAttempts!: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  error?: string;

  @HasMany(() => NotificationDelivery)
  deliveries!: NotificationDelivery[];

  @BeforeCreate
  @BeforeUpdate
  static validateNotification(instance: Notification) {
    // Ensure scheduled notifications have a future date
    if (instance.scheduledAt && instance.scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Ensure expiry date is after scheduled date
    if (instance.expiresAt && instance.scheduledAt && instance.expiresAt <= instance.scheduledAt) {
      throw new Error('Expiry date must be after scheduled date');
    }

    // Validate channels array is not empty
    if (!instance.channels || instance.channels.length === 0) {
      throw new Error('At least one notification channel must be specified');
    }
  }

  // Instance methods
  public isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  public isScheduled(): boolean {
    return this.scheduledAt ? new Date() < this.scheduledAt : false;
  }

  public canRetry(): boolean {
    return this.attempts < this.maxAttempts && !this.isExpired();
  }

  public markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
  }

  public markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  public markAsFailed(error: string): void {
    this.status = NotificationStatus.FAILED;
    this.error = error;
  }

  public incrementAttempts(): void {
    this.attempts += 1;
  }

  // Static methods
  static async findByUserId(userId: string, limit = 50, offset = 0) {
    return this.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [NotificationDelivery]
    });
  }

  static async findUnread(userId: string) {
    return this.findAll({
      where: {
        userId,
        status: [NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED]
      },
      order: [['createdAt', 'DESC']],
      include: [NotificationDelivery]
    });
  }

  static async findPendingForDelivery() {
    return this.findAll({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: {
          [require('sequelize').Op.or]: [
            null,
            { [require('sequelize').Op.lte]: new Date() }
          ]
        },
        expiresAt: {
          [require('sequelize').Op.or]: [
            null,
            { [require('sequelize').Op.gt]: new Date() }
          ]
        }
      },
      order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });
  }
}