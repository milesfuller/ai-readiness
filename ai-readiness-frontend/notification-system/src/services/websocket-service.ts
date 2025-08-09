import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from './redis-service';
import { Logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export interface WebSocketServiceConfig {
  port?: number;
  redis?: RedisService;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  auth: {
    secret: string;
    expiresIn?: string;
  };
  rateLimit?: {
    connectionLimit: number;
    messageLimit: number;
    windowMs: number;
  };
}

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole?: string;
}

export class WebSocketService {
  private io: Server;
  private redis?: RedisService;
  private logger: Logger;
  private config: WebSocketServiceConfig;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private messageRateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(server: any, config: WebSocketServiceConfig) {
    this.config = config;
    this.logger = new Logger('WebSocketService');
    this.redis = config.redis;

    // Initialize Socket.IO server
    this.io = new Server(server, {
      cors: config.cors || {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    // Setup Redis adapter if available
    if (this.redis) {
      const pubClient = this.redis.getClient();
      const subClient = pubClient.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
      this.logger.info('Redis adapter configured for WebSocket clustering');
    }

    this.setupAuthentication();
    this.setupConnectionHandling();
    this.setupRateLimiting();
    this.startCleanupTimer();

    this.logger.info('WebSocket service initialized');
  }

  private setupAuthentication(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('Authentication token missing');
        }

        const decoded = jwt.verify(token, this.config.auth.secret) as any;
        
        if (!decoded.userId) {
          throw new Error('Invalid token payload');
        }

        // Check connection limit
        const userSockets = this.connectedUsers.get(decoded.userId);
        const maxConnections = this.config.rateLimit?.connectionLimit || 5;
        
        if (userSockets && userSockets.size >= maxConnections) {
          throw new Error('Connection limit exceeded');
        }

        // Attach user info to socket
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).userRole = decoded.role;

        this.logger.info(`Socket authenticated for user ${decoded.userId}`);
        next();
      } catch (error) {
        this.logger.warn(`Socket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandling(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId;
      
      this.logger.info(`User ${userId} connected with socket ${socket.id}`);

      // Track connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);
      this.socketUsers.set(socket.id, userId);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Send connection acknowledgment
      socket.emit('connected', {
        socketId: socket.id,
        userId: userId,
        timestamp: new Date().toISOString()
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle user status updates
      socket.on('updateStatus', (status) => {
        this.handleStatusUpdate(socket, status);
      });

      // Handle joining specific rooms (e.g., for categories)
      socket.on('joinRoom', (data) => {
        this.handleJoinRoom(socket, data);
      });

      socket.on('leaveRoom', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      // Setup error handling
      socket.on('error', (error) => {
        this.logger.error(`Socket error for user ${userId}`, error);
      });
    });
  }

  private setupRateLimiting(): void {
    if (!this.config.rateLimit) return;

    this.io.use((socket: AuthenticatedSocket, next) => {
      const userId = socket.userId;
      const now = Date.now();
      const windowMs = this.config.rateLimit!.windowMs;
      const messageLimit = this.config.rateLimit!.messageLimit;

      const userLimit = this.messageRateLimiter.get(userId);
      
      if (!userLimit || now > userLimit.resetTime) {
        this.messageRateLimiter.set(userId, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
      } else if (userLimit.count < messageLimit) {
        userLimit.count++;
        next();
      } else {
        this.logger.warn(`Rate limit exceeded for user ${userId}`);
        next(new Error('Rate limit exceeded'));
      }
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const userId = socket.userId;
    
    this.logger.info(`User ${userId} disconnected: ${reason}`);

    // Clean up tracking
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.socketUsers.delete(socket.id);

    // Clean up rate limiting
    if (reason === 'transport close' || reason === 'client namespace disconnect') {
      // Clean up rate limiting after some delay to prevent rapid reconnections
      setTimeout(() => {
        const userSockets = this.connectedUsers.get(userId);
        if (!userSockets || userSockets.size === 0) {
          this.messageRateLimiter.delete(userId);
        }
      }, 60000); // 1 minute
    }
  }

  private handleStatusUpdate(socket: AuthenticatedSocket, status: any): void {
    const userId = socket.userId;
    
    // Broadcast status update to user's other connections
    socket.to(`user:${userId}`).emit('userStatusUpdate', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });

    this.logger.debug(`Status updated for user ${userId}`, status);
  }

  private handleJoinRoom(socket: AuthenticatedSocket, data: { room: string }): void {
    const { room } = data;
    
    // Validate room name (only allow specific patterns)
    if (!this.isValidRoomName(room)) {
      socket.emit('error', { message: 'Invalid room name' });
      return;
    }

    socket.join(room);
    socket.emit('joinedRoom', { room, timestamp: new Date().toISOString() });
    
    this.logger.debug(`User ${socket.userId} joined room ${room}`);
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, data: { room: string }): void {
    const { room } = data;
    
    socket.leave(room);
    socket.emit('leftRoom', { room, timestamp: new Date().toISOString() });
    
    this.logger.debug(`User ${socket.userId} left room ${room}`);
  }

  private isValidRoomName(room: string): boolean {
    // Allow specific room patterns
    const validPatterns = [
      /^category:.+$/,
      /^priority:[1-5]$/,
      /^system$/
    ];

    return validPatterns.some(pattern => pattern.test(room));
  }

  private startCleanupTimer(): void {
    // Clean up rate limiting data every hour
    setInterval(() => {
      const now = Date.now();
      for (const [userId, data] of this.messageRateLimiter.entries()) {
        if (now > data.resetTime) {
          this.messageRateLimiter.delete(userId);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // Public methods for external use

  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    this.logger.debug(`Emitted ${event} to user ${userId}`);
  }

  emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    this.logger.debug(`Emitted ${event} to room ${room}`);
  }

  emitToAll(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    this.logger.debug(`Emitted ${event} to all connected clients`);
  }

  onEvent(event: string, handler: (socket: AuthenticatedSocket, data: any) => void): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      socket.on(event, (data) => {
        try {
          handler(socket, data);
        } catch (error) {
          this.logger.error(`Error handling event ${event}`, error);
          socket.emit('error', { 
            event, 
            message: 'Internal server error',
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  getTotalConnections(): number {
    return this.io.engine.clientsCount;
  }

  isUserConnected(userId: string): boolean {
    const userSockets = this.connectedUsers.get(userId);
    return userSockets ? userSockets.size > 0 : false;
  }

  disconnectUser(userId: string, reason?: string): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });
    }

    this.logger.info(`Disconnected all sockets for user ${userId}`, { reason });
  }

  async broadcastSystemMessage(message: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'error';
    targetUsers?: string[];
  }): Promise<void> {
    const payload = {
      ...message,
      timestamp: new Date().toISOString(),
      isSystemMessage: true
    };

    if (message.targetUsers && message.targetUsers.length > 0) {
      // Send to specific users
      message.targetUsers.forEach(userId => {
        this.emitToUser(userId, 'systemMessage', payload);
      });
    } else {
      // Broadcast to all
      this.emitToAll('systemMessage', payload);
    }

    this.logger.info(`Broadcasted system message: ${message.title}`);
  }

  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    roomCounts: Record<string, number>;
    rateLimitHits: number;
  } {
    const roomCounts: Record<string, number> = {};
    
    // Get room information
    this.io.sockets.adapter.rooms.forEach((sockets, room) => {
      if (!room.startsWith('user:')) {
        roomCounts[room] = sockets.size;
      }
    });

    return {
      totalConnections: this.getTotalConnections(),
      uniqueUsers: this.connectedUsers.size,
      roomCounts,
      rateLimitHits: this.messageRateLimiter.size
    };
  }

  isHealthy(): boolean {
    try {
      // Basic health check
      return this.io.engine.clientsCount >= 0;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info('Closing WebSocket service...');
      
      // Notify all connected clients
      this.emitToAll('serverShutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      });

      // Close all connections
      this.io.close(() => {
        this.connectedUsers.clear();
        this.socketUsers.clear();
        this.messageRateLimiter.clear();
        
        this.logger.info('WebSocket service closed');
        resolve();
      });
    });
  }
}