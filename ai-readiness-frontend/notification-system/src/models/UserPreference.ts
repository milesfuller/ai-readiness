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
import { NotificationType, NotificationChannel } from '../types';

@Table({
  tableName: 'user_preferences',
  timestamps: true,
  indexes: [
    { fields: ['user_id'], unique: true }
  ]
})
export class UserPreference extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Index
  @Column(DataType.UUID)
  userId!: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  emailEnabled!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  pushEnabled!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  smsEnabled!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  inAppEnabled!: boolean;

  @AllowNull(false)
  @Default({
    [NotificationType.SYSTEM]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    [NotificationType.USER_ACTION]: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    [NotificationType.MARKETING]: [NotificationChannel.EMAIL],
    [NotificationType.SECURITY]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
    [NotificationType.BILLING]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    [NotificationType.SOCIAL]: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    [NotificationType.REMINDER]: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
  })
  @Column(DataType.JSONB)
  channels!: Record<NotificationType, NotificationChannel[]>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };

  @AllowNull(false)
  @Default({
    [NotificationType.SYSTEM]: 'immediate',
    [NotificationType.USER_ACTION]: 'immediate',
    [NotificationType.MARKETING]: 'daily',
    [NotificationType.SECURITY]: 'immediate',
    [NotificationType.BILLING]: 'immediate',
    [NotificationType.SOCIAL]: 'immediate',
    [NotificationType.REMINDER]: 'immediate'
  })
  @Column(DataType.JSONB)
  frequency!: Record<NotificationType, 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never'>;

  @AllowNull(true)
  @Column(DataType.STRING(10))
  language?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  timezone?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  customSettings?: Record<string, any>;

  @BeforeCreate
  @BeforeUpdate
  static validatePreferences(instance: UserPreference) {
    // Validate quiet hours format
    if (instance.quietHours) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(instance.quietHours.start) || !timeRegex.test(instance.quietHours.end)) {
        throw new Error('Invalid quiet hours format. Use HH:mm format');
      }
    }

    // Validate channels configuration
    if (instance.channels) {
      for (const [type, channels] of Object.entries(instance.channels)) {
        if (!Object.values(NotificationType).includes(type as NotificationType)) {
          throw new Error(`Invalid notification type: ${type}`);
        }
        
        if (!Array.isArray(channels)) {
          throw new Error(`Channels for ${type} must be an array`);
        }

        for (const channel of channels) {
          if (!Object.values(NotificationChannel).includes(channel)) {
            throw new Error(`Invalid notification channel: ${channel}`);
          }
        }
      }
    }

    // Validate frequency configuration
    if (instance.frequency) {
      const validFrequencies = ['immediate', 'hourly', 'daily', 'weekly', 'never'];
      for (const [type, frequency] of Object.entries(instance.frequency)) {
        if (!Object.values(NotificationType).includes(type as NotificationType)) {
          throw new Error(`Invalid notification type in frequency: ${type}`);
        }
        
        if (!validFrequencies.includes(frequency)) {
          throw new Error(`Invalid frequency: ${frequency}`);
        }
      }
    }
  }

  // Instance methods
  public isInQuietHours(date = new Date()): boolean {
    if (!this.quietHours) return false;

    const timezone = this.quietHours.timezone || 'UTC';
    const currentTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.quietHours.start.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = this.quietHours.end.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMinute;

    if (startTotalMinutes <= endTotalMinutes) {
      // Same day range
      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    } else {
      // Crosses midnight
      return currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }
  }

  public getChannelsForType(type: NotificationType): NotificationChannel[] {
    const channels = this.channels[type] || [];
    const enabledChannels: NotificationChannel[] = [];

    for (const channel of channels) {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (this.emailEnabled) enabledChannels.push(channel);
          break;
        case NotificationChannel.PUSH:
          if (this.pushEnabled) enabledChannels.push(channel);
          break;
        case NotificationChannel.SMS:
          if (this.smsEnabled) enabledChannels.push(channel);
          break;
        case NotificationChannel.IN_APP:
          if (this.inAppEnabled) enabledChannels.push(channel);
          break;
        default:
          enabledChannels.push(channel);
      }
    }

    return enabledChannels;
  }

  public getFrequencyForType(type: NotificationType): string {
    return this.frequency[type] || 'immediate';
  }

  public shouldReceiveNotification(type: NotificationType, channel: NotificationChannel): boolean {
    const frequency = this.getFrequencyForType(type);
    if (frequency === 'never') return false;

    const enabledChannels = this.getChannelsForType(type);
    if (!enabledChannels.includes(channel)) return false;

    // Check quiet hours for non-urgent notifications
    if (type !== NotificationType.SECURITY && this.isInQuietHours()) {
      return false;
    }

    return true;
  }

  // Static methods
  static async findByUserId(userId: string): Promise<UserPreference | null> {
    return this.findOne({ where: { userId } });
  }

  static async findOrCreateByUserId(userId: string): Promise<[UserPreference, boolean]> {
    return this.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        inAppEnabled: true
      }
    });
  }

  static async updatePreferences(userId: string, preferences: Partial<UserPreference>): Promise<[number, UserPreference[]]> {
    return this.update(preferences, {
      where: { userId },
      returning: true
    });
  }
}