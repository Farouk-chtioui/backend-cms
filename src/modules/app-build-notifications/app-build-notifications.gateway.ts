import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
})
export class AppBuildNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AppBuildNotificationsGateway.name);
  
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string[]> = new Map();

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        const sockets = this.userSockets.get(userId) || [];
        this.userSockets.set(userId, [...sockets, client.id]);
        this.logger.log(`Client connected to build notifications: ${client.id} for user: ${userId}`);
        
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
      this.logger.log(`Client disconnected from build notifications: ${client.id}`);
      
      // Find userId for this client and remove from userSockets
      for (const [userId, sockets] of this.userSockets.entries()) {
        if (sockets.includes(client.id)) {
          this.userSockets.set(
            userId,
            sockets.filter(id => id !== client.id)
          );
          
          // Check if this was the user's last socket
          const remainingSockets = this.userSockets.get(userId) || [];
          if (remainingSockets.length === 0) {
            this.logger.log(`User ${userId} has no more active connections to build notifications`);
          }
          
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
        this.logger.log(`User ${userId} checking build notifications`);
        client.emit('checkPendingBuildNotifications');
      }
    } catch (error) {
      this.logger.error(`Error checking notifications: ${error.message}`);
    }
  }

  sendNotificationToUser(userId: string, notification: any): boolean {
    try {
      // Send to individual sockets
      const sockets = this.userSockets.get(userId);
      if (sockets && sockets.length) {
        this.logger.log(`Sending build notification to user: ${userId} (${sockets.length} active connections)`);
        sockets.forEach(socketId => {
          this.server.to(socketId).emit('buildNotification', notification);
        });
        return true;
      }
      
      // Also send to user's channel for any future connections
      this.server.to(`app-builds-${userId}`).emit('buildNotification', notification);
      
      this.logger.log(`User ${userId} not connected, notification will be delivered on reconnection`);
      return false;
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}: ${error.message}`);
      return false;
    }
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
