import { EventEmitter } from 'events';
import { DatabaseService } from './database-service';
import { WebSocketService } from './websocket-service';
import { Logger } from '../utils/logger';
import { 
  Notification, 
  NotificationStatus, 
  NotificationEvent,
  NotificationDeliveryResult,
  PaginatedResponse,
  NotificationFilters 
} from '../types';

export interface InAppNotificationServiceConfig {
  database: DatabaseService;
  websocket: WebSocketService;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export class InAppNotificationService extends EventEmitter {
  private db: DatabaseService;
  private websocket: WebSocketService;
  private logger: Logger;
  private config: InAppNotificationServiceConfig;

  constructor(config: InAppNotificationServiceConfig) {
    super();
    this.db = config.database;
    this.websocket = config.websocket;
    this.config = config;
    this.logger = new Logger('InAppNotificationService');

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    // Handle clients marking notifications as read
    this.websocket.onEvent('markRead', async (socket, data) => {
      try {
        const { notificationId } = data;
        const userId = socket.userId; // Assumes userId is set on socket during auth
        
        await this.markAsRead(userId, notificationId);
        
        // Acknowledge the read status
        socket.emit('markReadAck', { notificationId, success: true });
      } catch (error) {
        this.logger.error('Failed to mark notification as read via WebSocket', error);
        socket.emit('markReadAck', { 
          notificationId: data.notificationId, 
          success: false, 
          error: error.message 
        });
      }
    });

    // Handle bulk mark as read
    this.websocket.onEvent('markBulkRead', async (socket, data) => {
      try {
        const { notificationIds } = data;
        const userId = socket.userId;
        
        const results = await this.markMultipleAsRead(userId, notificationIds);
        
        socket.emit('markBulkReadAck', { results, success: true });
      } catch (error) {
        this.logger.error('Failed to bulk mark notifications as read', error);
        socket.emit('markBulkReadAck', { 
          success: false, 
          error: error.message 
        });
      }
    });

    // Handle notification deletion
    this.websocket.onEvent('deleteNotification', async (socket, data) => {
      try {
        const { notificationId } = data;
        const userId = socket.userId;
        
        await this.deleteNotification(userId, notificationId);
        
        socket.emit('deleteNotificationAck', { notificationId, success: true });
        
        // Broadcast to all user's connected clients
        this.websocket.emitToUser(userId, 'notificationDeleted', { notificationId });
      } catch (error) {
        this.logger.error('Failed to delete notification via WebSocket', error);
        socket.emit('deleteNotificationAck', { 
          notificationId: data.notificationId, 
          success: false, 
          error: error.message 
        });
      }
    });
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    try {
      this.logger.info(`Creating in-app notification for user ${notification.userId}`);

      const created = await this.db.query(
        `INSERT INTO notifications (
          user_id, category_id, title, message, type, priority,
          send_email, send_in_app, send_push, status,
          scheduled_at, expires_at, metadata, template_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          notification.userId,
          notification.categoryId,
          notification.title,
          notification.message,
          notification.type,
          notification.priority || 1,
          false, // send_email
          true,  // send_in_app
          false, // send_push
          'delivered',
          notification.scheduledAt,
          notification.expiresAt,
          JSON.stringify(notification.metadata || {}),
          JSON.stringify(notification.templateData || {})
        ]
      );

      const createdNotification = this.mapDbToNotification(created.rows[0]);

      // Log the creation event
      await this.logEvent(createdNotification.id, 'created');

      // Emit real-time notification to user
      await this.emitToUser(createdNotification);

      // Emit internal event
      this.emit('notificationCreated', createdNotification);

      this.logger.info(`In-app notification created successfully`, {
        notificationId: createdNotification.id,
        userId: notification.userId
      });

      return createdNotification;
    } catch (error) {
      this.logger.error('Failed to create in-app notification', error);
      throw error;
    }
  }

  async getNotifications(
    userId: string, 
    filters: NotificationFilters = {},
    page = 1,
    limit = this.config.defaultPageSize || 20
  ): Promise<PaginatedResponse<Notification>> {
    try {
      // Ensure limit doesn't exceed maximum
      const maxLimit = this.config.maxPageSize || 100;
      const actualLimit = Math.min(limit, maxLimit);
      const offset = (page - 1) * actualLimit;

      let whereConditions = ['n.user_id = $1', 'n.send_in_app = true'];
      let params: any[] = [userId];
      let paramIndex = 2;

      // Add filters
      if (filters.category) {
        whereConditions.push(`nc.name = $${paramIndex}`);
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.status === 'read') {
        whereConditions.push('n.read_at IS NOT NULL');
      } else if (filters.status === 'unread') {
        whereConditions.push('n.read_at IS NULL');
      }

      if (filters.priority) {
        whereConditions.push(`n.priority >= $${paramIndex}`);
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.type) {
        whereConditions.push(`n.type = $${paramIndex}`);
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.fromDate) {
        whereConditions.push(`n.created_at >= $${paramIndex}`);
        params.push(filters.fromDate);
        paramIndex++;
      }

      if (filters.toDate) {
        whereConditions.push(`n.created_at <= $${paramIndex}`);
        params.push(filters.toDate);
        paramIndex++;
      }

      // Add expiration filter
      whereConditions.push('(n.expires_at IS NULL OR n.expires_at > NOW())');

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await this.db.query(
        `SELECT COUNT(*) as total
         FROM notifications n
         JOIN notification_categories nc ON n.category_id = nc.id
         WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get notifications with category info
      const result = await this.db.query(
        `SELECT 
          n.*,
          nc.name as category_name,
          nc.icon as category_icon,
          nc.color as category_color
         FROM notifications n
         JOIN notification_categories nc ON n.category_id = nc.id
         WHERE ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, actualLimit, offset]
      );

      const notifications = result.rows.map(row => this.mapDbToNotification(row));

      return {
        data: notifications,
        pagination: {
          page,
          limit: actualLimit,
          total,
          pages: Math.ceil(total / actualLimit),
          hasNext: page * actualLimit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.logger.error('Failed to get notifications', error);
      throw error;
    }
  }

  async getNotification(userId: string, notificationId: string): Promise<Notification | null> {
    try {
      const result = await this.db.query(
        `SELECT 
          n.*,
          nc.name as category_name,
          nc.icon as category_icon,
          nc.color as category_color
         FROM notifications n
         JOIN notification_categories nc ON n.category_id = nc.id
         WHERE n.id = $1 AND n.user_id = $2 AND n.send_in_app = true`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbToNotification(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to get notification', error);
      throw error;
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE notifications 
         SET read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND read_at IS NULL
         RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return false; // Notification not found or already read
      }

      // Log the read event
      await this.logEvent(notificationId, 'read');

      // Emit real-time update
      this.websocket.emitToUser(userId, 'notificationRead', { 
        notificationId,
        readAt: new Date().toISOString()
      });

      // Emit internal event
      this.emit('notificationRead', { userId, notificationId });

      this.logger.info(`Notification marked as read`, {
        notificationId,
        userId
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  async markMultipleAsRead(userId: string, notificationIds: string[]): Promise<Array<{ id: string; success: boolean }>> {
    const results: Array<{ id: string; success: boolean }> = [];

    try {
      for (const notificationId of notificationIds) {
        const success = await this.markAsRead(userId, notificationId);
        results.push({ id: notificationId, success });
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to mark multiple notifications as read', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string, categoryId?: string): Promise<number> {
    try {
      let query = `UPDATE notifications 
                   SET read_at = NOW(), updated_at = NOW()
                   WHERE user_id = $1 AND read_at IS NULL AND send_in_app = true`;
      let params = [userId];

      if (categoryId) {
        query += ` AND category_id = $2`;
        params.push(categoryId);
      }

      query += ` RETURNING id`;

      const result = await this.db.query(query, params);
      const updatedIds = result.rows.map(row => row.id);

      // Log read events for all updated notifications
      await Promise.all(
        updatedIds.map(id => this.logEvent(id, 'read'))
      );

      // Emit bulk update to user
      if (updatedIds.length > 0) {
        this.websocket.emitToUser(userId, 'bulkNotificationsRead', { 
          notificationIds: updatedIds,
          readAt: new Date().toISOString()
        });
      }

      this.logger.info(`Marked ${updatedIds.length} notifications as read`, {
        userId,
        categoryId: categoryId || 'all'
      });

      return updatedIds.length;
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM notifications 
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      this.logger.info(`Notification deleted`, {
        notificationId,
        userId
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete notification', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string, categoryId?: string): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count
                   FROM notifications n
                   WHERE n.user_id = $1 
                   AND n.read_at IS NULL 
                   AND n.send_in_app = true
                   AND n.status IN ('sent', 'delivered')
                   AND (n.expires_at IS NULL OR n.expires_at > NOW())`;
      let params = [userId];

      if (categoryId) {
        query += ` AND n.category_id = $2`;
        params.push(categoryId);
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Failed to get unread count', error);
      throw error;
    }
  }

  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    todayCount: number;
    weeklyCount: number;
    categoryBreakdown: Array<{ category: string; count: number; unread: number }>;
  }> {
    try {
      // Get overall stats
      const statsResult = await this.db.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as weekly_count
         FROM notifications 
         WHERE user_id = $1 
         AND send_in_app = true
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId]
      );

      // Get category breakdown
      const categoryResult = await this.db.query(
        `SELECT 
          nc.name as category,
          COUNT(n.id) as count,
          COUNT(CASE WHEN n.read_at IS NULL THEN 1 END) as unread
         FROM notification_categories nc
         LEFT JOIN notifications n ON nc.id = n.category_id 
           AND n.user_id = $1 
           AND n.send_in_app = true
           AND (n.expires_at IS NULL OR n.expires_at > NOW())
         GROUP BY nc.id, nc.name
         ORDER BY count DESC`,
        [userId]
      );

      const stats = statsResult.rows[0];
      const categoryBreakdown = categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        unread: parseInt(row.unread)
      }));

      return {
        total: parseInt(stats.total),
        unread: parseInt(stats.unread),
        todayCount: parseInt(stats.today_count),
        weeklyCount: parseInt(stats.weekly_count),
        categoryBreakdown
      };
    } catch (error) {
      this.logger.error('Failed to get notification stats', error);
      throw error;
    }
  }

  private async emitToUser(notification: Notification): Promise<void> {
    try {
      this.websocket.emitToUser(notification.userId, 'notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        category: notification.category,
        createdAt: notification.createdAt,
        metadata: notification.metadata
      });

      // Also emit unread count update
      const unreadCount = await this.getUnreadCount(notification.userId);
      this.websocket.emitToUser(notification.userId, 'unreadCountUpdate', { 
        count: unreadCount 
      });
    } catch (error) {
      this.logger.error('Failed to emit notification to user', error);
      // Don't throw error as this is not critical for notification creation
    }
  }

  private async logEvent(
    notificationId: string, 
    eventType: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO notification_events (notification_id, event_type, additional_data)
         VALUES ($1, $2, $3)`,
        [notificationId, eventType, JSON.stringify(metadata)]
      );
    } catch (error) {
      this.logger.error('Failed to log notification event', error);
      // Don't throw error as this is not critical
    }
  }

  private mapDbToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      title: row.title,
      message: row.message,
      type: row.type,
      priority: row.priority,
      status: row.status,
      isRead: row.read_at !== null,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      expiresAt: row.expires_at,
      metadata: row.metadata || {},
      templateData: row.template_data || {},
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color
      } : undefined
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test database connection
      await this.db.query('SELECT 1');
      
      // Test WebSocket service
      const wsStatus = this.websocket.isHealthy();

      return {
        status: wsStatus ? 'healthy' : 'unhealthy',
        details: {
          database: 'connected',
          websocket: wsStatus ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}