import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Index,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { NotificationChannel, NotificationStatus } from '../types';
import { Notification } from './Notification';

@Table({
  tableName: 'notification_deliveries',
  timestamps: true,
  indexes: [
    { fields: ['notification_id'] },
    { fields: ['channel'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
})
export class NotificationDelivery extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Notification)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  notificationId!: string;

  @BelongsTo(() => Notification)
  notification!: Notification;

  @AllowNull(false)
  @Index
  @Column(DataType.ENUM(...Object.values(NotificationChannel)))
  channel!: NotificationChannel;

  @AllowNull(false)
  @Default(NotificationStatus.PENDING)
  @Index
  @Column(DataType.ENUM(...Object.values(NotificationStatus)))
  status!: NotificationStatus;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  externalId?: string; // ID from external service (email provider, push service, etc.)

  @AllowNull(true)
  @Column(DataType.DATE)
  sentAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  deliveredAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  readAt?: Date;

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

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;

  // Instance methods
  public markAsSent(externalId?: string): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    if (externalId) {
      this.externalId = externalId;
    }
  }

  public markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  public markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
  }

  public markAsFailed(error: string): void {
    this.status = NotificationStatus.FAILED;
    this.error = error;
  }

  public incrementAttempts(): void {
    this.attempts += 1;
  }

  public canRetry(): boolean {
    return this.attempts < this.maxAttempts && this.status === NotificationStatus.FAILED;
  }

  // Static methods
  static async findByChannel(channel: NotificationChannel, limit = 100) {
    return this.findAll({
      where: { channel },
      limit,
      order: [['createdAt', 'DESC']],
      include: [Notification]
    });
  }

  static async findPendingByChannel(channel: NotificationChannel) {
    return this.findAll({
      where: {
        channel,
        status: NotificationStatus.PENDING
      },
      order: [['createdAt', 'ASC']],
      include: [Notification]
    });
  }

  static async getDeliveryStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[require('sequelize').Op.gte] = startDate;
      }
      if (endDate) {
        whereClause.createdAt[require('sequelize').Op.lte] = endDate;
      }
    }

    return this.findAll({
      where: whereClause,
      attributes: [
        'channel',
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['channel', 'status'],
      raw: true
    });
  }
}