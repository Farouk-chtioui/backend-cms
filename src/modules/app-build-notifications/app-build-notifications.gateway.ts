import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  OnGatewayInit,
  WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleDestroy } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Accept connections from any origin (will be restricted in production)
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Optimize connection settings
  pingInterval: 30000, // Check connection every 30 seconds
  pingTimeout: 20000,  // Wait 20 seconds for response before considering disconnected
  transports: ['websocket'], // Prefer WebSocket transport over polling for better performance
  // Add compression to reduce bandwidth usage
  perMessageDeflate: true,
})
export class AppBuildNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy {
  private readonly logger = new Logger(AppBuildNotificationsGateway.name);
  
  @WebSocketServer()
  server: Server;

  // Track active connections with auto-expiration
  private userSockets: Map<string, { socketIds: string[], buildInProgress: boolean, lastActivity: number }> = new Map();
  // Rate limiting for notifications
  private lastNotificationTime: Map<string, number> = new Map();
  private notificationThreshold: number = 2000; // 2 seconds between notifications
  // Cleanup intervals
  private cleanupInterval: NodeJS.Timeout;
  private inactivityInterval: NodeJS.Timeout;
  // Auto-disconnect timeout (5 minutes without activity)
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000;
  
  // Initialize maintenance tasks when gateway starts
  afterInit() {
    // Run memory cleanup every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 15 * 60 * 1000);
    
    // Check for inactive connections every minute
    this.inactivityInterval = setInterval(() => {
      this.disconnectInactiveUsers();
    }, 60 * 1000);
    
    this.logger.log('App build notifications gateway initialized with optimized connection management');
  }
  
  // Clean up inactive connections
  private disconnectInactiveUsers() {
    try {
      const now = Date.now();
      let disconnectCount = 0;
      
      for (const [userId, userInfo] of this.userSockets.entries()) {
        // Only disconnect if no build is in progress and user has been inactive
        if (!userInfo.buildInProgress && (now - userInfo.lastActivity > this.INACTIVITY_TIMEOUT)) {
          // Disconnect all user sockets
          userInfo.socketIds.forEach(socketId => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
              this.logger.debug(`Disconnecting inactive socket ${socketId} for user ${userId}`);
              // Notify client before disconnecting
              socket.emit('inactiveDisconnect', { message: 'Disconnected due to inactivity. Reconnect when needed.' });
              socket.disconnect(true);
            }
          });
          
          // Remove user from tracking
          this.userSockets.delete(userId);
          disconnectCount++;
        }
      }
      
      if (disconnectCount > 0) {
        this.logger.log(`Disconnected ${disconnectCount} inactive users`);
      }
    } catch (error) {
      this.logger.error(`Error during inactive user disconnection: ${error.message}`);
    }
  }
  
  // Clean up stale data to prevent memory leaks
  private performMemoryCleanup() {
    try {
      const now = Date.now();
      const staleThreshold = 8 * 60 * 60 * 1000; // 8 hours
      
      // Clean up last notification times that are stale
      let notificationCleanupCount = 0;
      for (const [userId, lastNotification] of this.lastNotificationTime.entries()) {
        if (now - lastNotification > staleThreshold) {
          this.lastNotificationTime.delete(userId);
          notificationCleanupCount++;
        }
      }
      
      // Clean up user sockets with no active connections
      let socketCleanupCount = 0;
      for (const [userId, userInfo] of this.userSockets.entries()) {
        if (userInfo.socketIds.length === 0) {
          this.userSockets.delete(userId);
          socketCleanupCount++;
        }
      }
      
      this.logger.log(`Build notifications memory cleanup completed - Removed ${notificationCleanupCount} stale notification entries and ${socketCleanupCount} empty socket entries`);
    } catch (error) {
      this.logger.error('Error during memory cleanup', error);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = client.handshake.query.userId as string;
      const buildId = client.handshake.query.buildId as string; 
      
      // Require either a userId or buildId for connection
      if (!userId) {
        this.logger.warn(`Client connection rejected - missing userId: ${client.id}`);
        throw new WsException('User ID is required for connection');
      }
      
      // Update or create user connection info
      const userInfo = this.userSockets.get(userId) || { 
        socketIds: [], 
        buildInProgress: !!buildId, // Mark build in progress if buildId provided
        lastActivity: Date.now() 
      };
      
      // Add socket to user's collection
      userInfo.socketIds.push(client.id);
      this.userSockets.set(userId, userInfo);
      
      // Join user's personal room for direct notifications
      client.join(`app-builds-${userId}`);
      
      // If connecting for a specific build, join that room too
      if (buildId) {
        client.join(`build-${buildId}`);
        this.logger.log(`User ${userId} connected for build ${buildId}`);
      } else {
        this.logger.debug(`User ${userId} connected to notifications gateway`);
      }
      
      // Tell client connection was successful
      client.emit('connected', { 
        status: 'connected',
        autoDisconnect: this.INACTIVITY_TIMEOUT / 1000
      });
    } catch (error) {
      this.logger.error(`Error during socket connection: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    try {
      let foundUser = null;
      
      // Find and remove socket from user's collection
      for (const [userId, userInfo] of this.userSockets.entries()) {
        const socketIndex = userInfo.socketIds.indexOf(client.id);
        if (socketIndex !== -1) {
          foundUser = userId;
          // Remove this socket ID
          userInfo.socketIds.splice(socketIndex, 1);
          this.logger.debug(`Socket ${client.id} disconnected for user ${userId}`);
          break;
        }
      }
      
      // Don't remove user data immediately to allow for reconnections
      // The cleanup job will remove users with no sockets
    } catch (error) {
      this.logger.error(`Error during socket disconnection: ${error.message}`);
    }
  }

  @SubscribeMessage('checkBuildNotifications')
  handleCheckNotifications(client: Socket): void {
    try {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        // Update last activity timestamp
        const userInfo = this.userSockets.get(userId);
        if (userInfo) {
          userInfo.lastActivity = Date.now();
          this.userSockets.set(userId, userInfo);
        }
        
        // Emit event to trigger client-side notification check
        client.emit('checkPendingBuildNotifications');
      }
    } catch (error) {
      this.logger.error(`Error checking notifications: ${error.message}`);
    }
  }
  
  @SubscribeMessage('subscribeToBuild')
  handleSubscribeToBuild(client: Socket, data: { buildId: string }): void {
    try {
      const userId = client.handshake.query.userId as string;
      const { buildId } = data;
      
      if (!userId || !buildId) {
        client.emit('error', { message: 'Missing required parameters' });
        return;
      }
      
      // Join build room
      client.join(`build-${buildId}`);
      
      // Mark user as having a build in progress
      const userInfo = this.userSockets.get(userId);
      if (userInfo) {
        userInfo.buildInProgress = true;
        userInfo.lastActivity = Date.now();
        this.userSockets.set(userId, userInfo);
      }
      
      this.logger.log(`User ${userId} subscribed to build ${buildId} updates`);
      client.emit('subscribed', { buildId });
    } catch (error) {
      this.logger.error(`Error subscribing to build: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to build' });
    }
  }
  
  @SubscribeMessage('unsubscribeFromBuild')
  handleUnsubscribeFromBuild(client: Socket, data: { buildId: string }): void {
    try {
      const userId = client.handshake.query.userId as string;
      const { buildId } = data;
      
      if (!userId || !buildId) {
        client.emit('error', { message: 'Missing required parameters' });
        return;
      }
      
      // Leave build room
      client.leave(`build-${buildId}`);
      
      // Mark user as no longer having a build in progress
      const userInfo = this.userSockets.get(userId);
      if (userInfo) {
        userInfo.buildInProgress = false;
        userInfo.lastActivity = Date.now();
        this.userSockets.set(userId, userInfo);
      }
      
      this.logger.log(`User ${userId} unsubscribed from build ${buildId} updates`);
      client.emit('unsubscribed', { buildId });
    } catch (error) {
      this.logger.error(`Error unsubscribing from build: ${error.message}`);
    }
  }

  sendNotificationToUser(userId: string, notification: any): boolean {
    try {
      // Update user's last activity time
      const userInfo = this.userSockets.get(userId);
      if (userInfo) {
        userInfo.lastActivity = Date.now();
        this.userSockets.set(userId, userInfo);
      }
      
      // Rate limit notifications to the same user
      const currentTime = Date.now();
      const lastNotification = this.lastNotificationTime.get(userId) || 0;
      
      // If we've sent a notification recently, queue it with a slight delay
      if (currentTime - lastNotification < this.notificationThreshold) {
        setTimeout(() => {
          this.doSendNotification(userId, notification);
        }, this.notificationThreshold);
        return true;
      }
      
      // Otherwise send immediately
      return this.doSendNotification(userId, notification);
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}: ${error.message}`);
      return false;
    }
  }
  
  sendBuildNotification(buildId: string, notification: any): boolean {
    try {
      if (!buildId) {
        this.logger.warn('Attempted to send build notification without buildId');
        return false;
      }
      
      // Send notification to all clients subscribed to this build
      this.server.to(`build-${buildId}`).emit('buildNotification', {
        ...notification,
        buildId
      });
      
      this.logger.debug(`Sent notification to build room: build-${buildId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification to build ${buildId}: ${error.message}`);
      return false;
    }
  }
  
  private doSendNotification(userId: string, notification: any): boolean {
    // Update the last notification time
    this.lastNotificationTime.set(userId, Date.now());
    
    // Send to individual sockets
    const userInfo = this.userSockets.get(userId);
    if (userInfo && userInfo.socketIds.length) {
      userInfo.socketIds.forEach(socketId => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('buildNotification', notification);
        }
      });
      return true;
    }
    
    // Also send to user's channel for any future connections
    this.server.to(`app-builds-${userId}`).emit('buildNotification', notification);
    return false;
  }
  
  // Get connection status for debugging
  getConnectionStatus(): any {
    const connectedUsers = Array.from(this.userSockets.entries()).map(([userId, userInfo]) => ({
      userId,
      socketCount: userInfo.socketIds.length,
      buildInProgress: userInfo.buildInProgress,
      lastActivity: new Date(userInfo.lastActivity).toISOString()
    }));
    
    return {
      totalSockets: connectedUsers.reduce((acc, user) => acc + user.socketCount, 0),
      connectedUsers: this.userSockets.size,
      activeBuilds: connectedUsers.filter(u => u.buildInProgress).length,
      userDetails: connectedUsers
    };
  }
  
  // Clean up resources on module destruction
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.inactivityInterval) {
      clearInterval(this.inactivityInterval);
    }
    
    this.logger.log('App build notifications gateway resources cleaned up');
  }
}
