import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Add connection throttling to prevent excessive reconnections
  pingInterval: 25000, // Check connection every 25 seconds
  pingTimeout: 20000,  // Wait 20 seconds for response before considering disconnected
})
export class AppBuildNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(AppBuildNotificationsGateway.name);
  
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string[]> = new Map();
  // Rate limiting for notifications
  private lastNotificationTime: Map<string, number> = new Map();
  private notificationThreshold: number = 2000; // 2 seconds between notifications
  // Cleanup interval reference
  private cleanupInterval: NodeJS.Timeout;
  
  // Initialize cleanup tasks when gateway starts
  afterInit() {
    // Run cleanup every 20 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 20 * 60 * 1000); // 20 minutes
    
    this.logger.log('App build notifications gateway initialized with memory management');
  }
  
  // Clean up stale data to prevent memory leaks
  private performMemoryCleanup() {
    try {
      const now = Date.now();
      const staleThreshold = 12 * 60 * 60 * 1000; // 12 hours
      
      // Clean up last notification times that are stale
      let notificationCleanupCount = 0;
      for (const [userId, lastNotification] of this.lastNotificationTime.entries()) {
        if (now - lastNotification > staleThreshold) {
          this.lastNotificationTime.delete(userId);
          notificationCleanupCount++;
        }
      }
      
      // Clean up disconnected user sockets
      let socketCleanupCount = 0;
      for (const [userId, sockets] of this.userSockets.entries()) {
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
          socketCleanupCount++;
        }
      }
      
      this.logger.log(`Build notifications memory cleanup completed - Removed ${notificationCleanupCount} stale notification timestamps and ${socketCleanupCount} empty socket entries`);
    } catch (error) {
      this.logger.error('Error during memory cleanup', error);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        const sockets = this.userSockets.get(userId) || [];
        this.userSockets.set(userId, [...sockets, client.id]);
        
        // Initialize user's app channel
        client.join(`app-builds-${userId}`);
      } else {
        this.logger.warn(`Client connected without userId: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Error during socket connection: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket): void {
    try {
      // Find userId for this client and remove from userSockets
      for (const [userId, sockets] of this.userSockets.entries()) {
        if (sockets.includes(client.id)) {
          this.userSockets.set(
            userId,
            sockets.filter(id => id !== client.id)
          );
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Error during socket disconnection: ${error.message}`);
    }
  }

  @SubscribeMessage('checkBuildNotifications')
  handleCheckNotifications(client: Socket): void {
    try {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        client.emit('checkPendingBuildNotifications');
      }
    } catch (error) {
      this.logger.error(`Error checking notifications: ${error.message}`);
    }
  }

  sendNotificationToUser(userId: string, notification: any): boolean {
    try {
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
  
  private doSendNotification(userId: string, notification: any): boolean {
    // Update the last notification time
    this.lastNotificationTime.set(userId, Date.now());
    
    // Send to individual sockets
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.length) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('buildNotification', notification);
      });
      return true;
    }
    
    // Also send to user's channel for any future connections
    this.server.to(`app-builds-${userId}`).emit('buildNotification');
    return false;
  }
  
  // Get connection status for debugging
  getConnectionStatus(): any {
    return {
      totalSockets: Array.from(this.userSockets.entries()).reduce((acc, [_, sockets]) => acc + sockets.length, 0),
      connectedUsers: this.userSockets.size,
      userSocketDetails: Array.from(this.userSockets.entries()).map(([userId, sockets]) => ({
        userId,
        socketCount: sockets.length
      }))
    };
  }
}
