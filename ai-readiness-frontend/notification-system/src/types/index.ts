export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export enum NotificationType {
  SYSTEM = 'system',
  USER_ACTION = 'user_action',
  MARKETING = 'marketing',
  SECURITY = 'security',
  BILLING = 'billing',
  SOCIAL = 'social',
  REMINDER = 'reminder'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
  WEBSOCKET = 'websocket'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface UserPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  channels: {
    [key in NotificationType]: NotificationChannel[];
  };
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency: {
    [key in NotificationType]: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationJob {
  id: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
  data: Record<string, any>;
}

export interface WebSocketMessage {
  type: 'notification' | 'status' | 'ack';
  payload: any;
  timestamp: Date;
  userId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  startDate?: Date;
  endDate?: Date;
  read?: boolean;
}