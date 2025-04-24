// team-notifications.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    OnGatewayInit
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, Inject, forwardRef } from '@nestjs/common';
  import { TeamsService } from '../teams/teams.service';
  
  @WebSocketGateway({
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Optimize connection parameters to reduce overhead
    pingInterval: 30000, // Check connection every 30 seconds (increased from 25s)
    pingTimeout: 25000,  // Wait 25 seconds for response (increased from 20s)
    transports: ['websocket'], // Prefer WebSocket transport over polling
    // Add compression to reduce bandwidth usage
    perMessageDeflate: true,
  })
  export class TeamNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly logger = new Logger(TeamNotificationsGateway.name);
    
    @WebSocketServer()
    server: Server;
  
    constructor(
      @Inject(forwardRef(() => TeamsService))
      private readonly teamsService: TeamsService,
    ) {}
  
    private userSockets: Map<string, string[]> = new Map();
    private userTeams: Map<string, Set<string>> = new Map();
    // Track last refresh time to prevent excessive room refreshing
    private lastRefreshTime: Map<string, number> = new Map();
    // Increase minimum time between refreshes to reduce DB load (10 seconds)
    private refreshThreshold: number = 10000;
    // Track last notification times to throttle notifications
    private lastNotificationTime: Map<string, number> = new Map();
    private notificationThreshold: number = 1000; // 1 second between notifications
    // Queue for batched notifications
    private notificationQueue: Map<string, any[]> = new Map();
    private notificationQueueTimer: NodeJS.Timeout;
    // Cleanup interval reference
    private cleanupInterval: NodeJS.Timeout;
    
    // Initialize cleanup tasks when gateway starts
    afterInit() {
      // Run cleanup every 30 minutes to prevent memory leaks (increased from 15 minutes)
      this.cleanupInterval = setInterval(() => {
        this.performMemoryCleanup();
      }, 30 * 60 * 1000); // 30 minutes
      
      // Set up notification batch processing every 2 seconds
      this.notificationQueueTimer = setInterval(() => {
        this.processNotificationQueue();
      }, 2000);
      
      this.logger.log('Team notifications gateway initialized with memory management and batch processing');
    }
    
    // Process batched notifications
    private processNotificationQueue() {
      try {
        if (this.notificationQueue.size === 0) return;
        
        // Process notifications for each user
        for (const [userId, notifications] of this.notificationQueue.entries()) {
          if (notifications.length === 0) continue;
          
          const sockets = this.userSockets.get(userId);
          if (!sockets || sockets.length === 0) continue;
          
          // If multiple notifications, batch them
          if (notifications.length > 1) {
            const batchedNotification = {
              type: 'batch',
              notifications: notifications,
              count: notifications.length
            };
            
            sockets.forEach(socketId => {
              this.server.to(socketId).emit('notification', batchedNotification);
            });
          } else {
            // Just send the single notification
            sockets.forEach(socketId => {
              this.server.to(socketId).emit('notification', notifications[0]);
            });
          }
          
          // Clear processed notifications
          this.notificationQueue.delete(userId);
        }
      } catch (error) {
        this.logger.error('Error processing notification queue:', error);
      }
    }
    
    // Cleanup stale data to prevent memory leaks
    private performMemoryCleanup() {
      try {
        const now = Date.now();
        const staleThreshold = 12 * 60 * 60 * 1000; // 12 hours (increased from 8)
        
        // Clean up last refresh times that are stale
        for (const [userId, lastRefresh] of this.lastRefreshTime.entries()) {
          if (now - lastRefresh > staleThreshold) {
            this.lastRefreshTime.delete(userId);
          }
        }
        
        // Clean up notification timestamps
        for (const [userId, lastNotification] of this.lastNotificationTime.entries()) {
          if (now - lastNotification > staleThreshold) {
            this.lastNotificationTime.delete(userId);
          }
        }
        
        // Clean up user teams for users who don't have active sockets
        for (const userId of this.userTeams.keys()) {
          const userSockets = this.userSockets.get(userId) || [];
          if (userSockets.length === 0) {
            // Check if we've seen this user recently
            const lastRefresh = this.lastRefreshTime.get(userId) || 0;
            if (now - lastRefresh > staleThreshold) {
              // If user has been inactive for over the threshold, clean up their team data
              this.userTeams.delete(userId);
            }
          }
        }
        
        // Clean up empty notification queues
        for (const [userId, queue] of this.notificationQueue.entries()) {
          if (queue.length === 0) {
            this.notificationQueue.delete(userId);
          }
        }
        
        this.logger.log(`Memory cleanup completed - Teams: ${this.userTeams.size}, Refresh times: ${this.lastRefreshTime.size}, Sockets: ${this.userSockets.size}, Notification queues: ${this.notificationQueue.size}`);
      } catch (error) {
        this.logger.error('Error during memory cleanup', error);
      }
    }
  
    async handleConnection(client: Socket): Promise<void> {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        const sockets = this.userSockets.get(userId) || [];
        // Check if this socket is already registered (prevent duplicates)
        if (!sockets.includes(client.id)) {
          this.userSockets.set(userId, [...sockets, client.id]);
          
          // When user connects, fetch their team memberships from the database
          // but only if they don't already have cached teams or it's been a while
          const cachedTeams = this.userTeams.get(userId);
          const lastRefresh = this.lastRefreshTime.get(userId) || 0;
          const now = Date.now();
          
          if (!cachedTeams || cachedTeams.size === 0 || now - lastRefresh > this.refreshThreshold) {
            await this.fetchAndRejoinUserTeams(userId, client);
          } else if (cachedTeams && cachedTeams.size > 0) {
            // Use cached team data if available to avoid DB query
            cachedTeams.forEach(teamId => {
              client.join(`team-${teamId}`);
            });
          }
        }
      } else {
        this.logger.warn(`Client connected without userId: ${client.id}`);
      }
    }
  
    async fetchAndRejoinUserTeams(userId: string, client: Socket): Promise<void> {
      try {
        // First check our in-memory cache
        const cachedTeams = this.userTeams.get(userId);
        if (cachedTeams && cachedTeams.size > 0) {
          cachedTeams.forEach(teamId => {
            client.join(`team-${teamId}`);
          });
          return; // Skip DB query if we have cached data
        }
        
        // Then fetch from database only if needed
        const userTeams = await this.teamsService.getTeamsForUser(userId);
        if (userTeams && userTeams.length > 0) {
          const teamSet = new Set<string>();
          
          userTeams.forEach(team => {
            const teamId = team._id.toString();
            teamSet.add(teamId);
            // Make sure to join even if it was in the cache
            client.join(`team-${teamId}`);
          });
          
          // Update the in-memory cache with the latest from DB
          this.userTeams.set(userId, teamSet);
          // Update last refresh time
          this.lastRefreshTime.set(userId, Date.now());
        }
      } catch (error) {
        this.logger.error(`Error fetching teams for user ${userId}:`, error);
      }
    }
  
    handleDisconnect(client: Socket): void {
      // Find userId for this client
      let disconnectedUserId = null;
      
      // Find and remove the client from userSockets
      for (const [userId, sockets] of this.userSockets.entries()) {
        if (sockets.includes(client.id)) {
          disconnectedUserId = userId;
          this.userSockets.set(
            userId,
            sockets.filter(id => id !== client.id)
          );
          break;
        }
      }
      
      // Don't remove team data immediately, let the cleanup job handle this
      // to avoid reconnection issues if user refreshes page
    }
  
    @SubscribeMessage('joinTeam')
    async handleJoinTeam(client: Socket, payload: { teamId: string, userId: string }): Promise<void> {
      const { teamId, userId } = payload;
      
      // Check if already in team room to avoid redundant joins
      const rooms = client.rooms;
      const teamRoom = `team-${teamId}`;
      
      if (!rooms.has(teamRoom)) {
        // Join the socket room
        client.join(teamRoom);
        
        // Track which teams a user is in
        const userTeamSet = this.userTeams.get(userId) || new Set();
        userTeamSet.add(teamId);
        this.userTeams.set(userId, userTeamSet);
        
        // After joining a team, check for any pending notifications
        client.emit('checkPendingNotifications');
        
        // Verify that the user is actually a member of this team in the database
        // but only do this occasionally to reduce DB load
        const lastRefresh = this.lastRefreshTime.get(userId) || 0;
        const now = Date.now();
        
        if (now - lastRefresh > this.refreshThreshold) {
          try {
            const team = await this.teamsService.findTeamById(teamId);
            const isMember = await this.teamsService.checkTeamMembership(team, userId);
            
            if (!isMember) {
              this.logger.warn(`User ${userId} joined team ${teamId} socket room but is not a member in the database!`);
              // Consider removing them from the room
              client.leave(teamRoom);
              const userTeamSet = this.userTeams.get(userId);
              if (userTeamSet) {
                userTeamSet.delete(teamId);
              }
            }
            
            // Update last refresh time
            this.lastRefreshTime.set(userId, now);
          } catch (error) {
            this.logger.error(`Error verifying team membership for user ${userId} in team ${teamId}:`, error);
          }
        }
      }
    }
  
    @SubscribeMessage('leaveTeam')
    handleLeaveTeam(client: Socket, payload: { teamId: string, userId: string }): void {
      const { teamId, userId } = payload;
      
      // Leave the socket room
      client.leave(`team-${teamId}`);
      
      // Remove team from user's tracked teams
      const userTeamSet = this.userTeams.get(userId);
      if (userTeamSet) {
        userTeamSet.delete(teamId);
      }
    }
  
    // Check if a user is a member of a team
    isUserTeamMember(userId: string, teamId: string): boolean {
      const userTeamSet = this.userTeams.get(userId);
      return !!(userTeamSet && userTeamSet.has(teamId));
    }
    
    // Get all teams for a user
    getUserTeams(userId: string): string[] {
      const userTeamSet = this.userTeams.get(userId);
      if (userTeamSet) {
        return Array.from(userTeamSet);
      }
      return [];
    }
  
    // This method forces a refresh of team memberships from the database
    async refreshUserTeamMemberships(userId: string): Promise<void> {
      try {
        // Rate limit refreshes to avoid excessive database queries
        const currentTime = Date.now();
        const lastRefresh = this.lastRefreshTime.get(userId) || 0;
        
        // Skip if we've refreshed recently (within the threshold)
        if (currentTime - lastRefresh < this.refreshThreshold) {
          return;
        }
        
        // Update the last refresh time
        this.lastRefreshTime.set(userId, currentTime);
        
        // Fetch all user's sockets
        const userSockets = this.userSockets.get(userId) || [];
        if (userSockets.length === 0) return; // Skip if no active sockets
  
        // Fetch teams from database
        const userTeams = await this.teamsService.getTeamsForUser(userId);
        if (!userTeams || userTeams.length === 0) {
          // Clear the cache if no teams found
          this.userTeams.set(userId, new Set());
          return;
        }
        
        // Update the team set in memory
        const teamSet = new Set<string>();
        userTeams.forEach(team => {
          teamSet.add(team._id.toString());
        });
        
        // Compare with existing team set to see if anything changed
        const existingTeamSet = this.userTeams.get(userId) || new Set();
        const hasChanges = teamSet.size !== existingTeamSet.size || 
          ![...teamSet].every(teamId => existingTeamSet.has(teamId));
        
        // Only update rooms if there are actual changes
        if (hasChanges) {
          this.userTeams.set(userId, teamSet);
          
          // For each socket, join all team rooms
          for (const socketId of userSockets) {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
              // First find only the team rooms (to avoid removing other rooms)
              const currentRooms = Array.from(socket.rooms.values())
                .filter(room => room.startsWith('team-'));
              
              // Get new rooms to join and rooms to leave
              const currentTeamIds = currentRooms.map(room => room.replace('team-', ''));
              const teamIdsToJoin = [...teamSet].filter(id => !currentTeamIds.includes(id));
              const roomsToLeave = currentRooms.filter(room => {
                const roomTeamId = room.replace('team-', '');
                return !teamSet.has(roomTeamId);
              });
              
              // Leave rooms that are no longer needed
              roomsToLeave.forEach(room => {
                socket.leave(room);
              });
              
              // Join new team rooms
              teamIdsToJoin.forEach(teamId => {
                socket.join(`team-${teamId}`);
              });
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error refreshing team memberships for user ${userId}:`, error);
      }
    }
  
    // Queue notification for a user instead of sending immediately
    addToNotificationQueue(userId: string, notification: any): void {
      // Get existing queue or create new one
      const queue = this.notificationQueue.get(userId) || [];
      
      // Add notification to queue
      queue.push(notification);
      
      // Update queue
      this.notificationQueue.set(userId, queue);
    }
  
    // Throttled notification sender
    sendNotificationToUser(userId: string, notification: any): boolean {
      // Check if user has any active sockets
      const sockets = this.userSockets.get(userId);
      if (!sockets || sockets.length === 0) {
        return false;
      }
      
      // Add to batch notification queue for processing
      this.addToNotificationQueue(userId, notification);
      
      // Rate limit direct notifications (outside of batched processing)
      const currentTime = Date.now();
      const lastNotification = this.lastNotificationTime.get(userId) || 0;
      
      // If we've sent a notification recently, don't send immediately
      if (currentTime - lastNotification < this.notificationThreshold) {
        return true; // Notification queued for batch processing
      }
      
      // Update last notification time
      this.lastNotificationTime.set(userId, currentTime);
      
      // For urgent notifications that shouldn't wait for batch processing
      // Send directly but still throttle
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('notification', notification);
      });
      
      return true;
    }
  
    sendNotificationToTeam(teamId: string, notification: any, excludeUserId?: string): void {
      // First, check if any team members are online
      const teamRoomName = `team-${teamId}`;
      const room = this.server.sockets.adapter.rooms.get(teamRoomName);
      
      // Include teamId and excludeUserId in the notification
      const enrichedNotification = {
        ...notification,
        teamId,
        excludeUserId
      };
      
      // Keep track of which users would receive this notification
      const notifiedUsers = new Set<string>();
      
      // For team notifications, use room broadcast when possible (more efficient)
      this.server.to(teamRoomName).emit('notification', enrichedNotification);
      
      // Track which users are in the room to avoid duplicate notifications
      const roomUsers = new Set<string>();
      if (room) {
        for (const socketId of room) {
          // Find which user this socket belongs to
          for (const [userId, sockets] of this.userSockets.entries()) {
            if (sockets.includes(socketId)) {
              roomUsers.add(userId);
              notifiedUsers.add(userId);
              break;
            }
          }
        }
      }
      
      // Only if needed, manually send to team members who aren't in the room
      // This could happen if they're connected but haven't explicitly joined the room
      const manualNotificationNeeded = this.userTeams.size > roomUsers.size;
      
      if (manualNotificationNeeded) {
        // Get team members who need manual notifications
        for (const [userId, teams] of this.userTeams.entries()) {
          // Skip the excluded user
          if (userId === excludeUserId) continue;
          
          // Skip users already notified via the room broadcast
          if (roomUsers.has(userId)) continue;
          
          // If user is tracking this team but not in the room, add notification to queue
          if (teams.has(teamId)) {
            this.addToNotificationQueue(userId, enrichedNotification);
            notifiedUsers.add(userId);
          }
        }
      }
    }
  
    // Method to get all team members for a given team
    async getTeamMembers(teamId: string): Promise<string[]> {
      try {
        // First check in-memory state for online users
        const teamMemberIds: string[] = [];
        for (const [userId, teams] of this.userTeams.entries()) {
          if (teams.has(teamId)) {
            teamMemberIds.push(userId);
          }
        }
        
        // Then fetch from database to ensure we have all members
        const team = await this.teamsService.findTeamById(teamId);
        if (team) {
          const members = await this.teamsService.getTeamMemberIds(team);
          // Combine and deduplicate
          members.forEach(memberId => {
            if (!teamMemberIds.includes(memberId)) {
              teamMemberIds.push(memberId);
            }
          });
        }
        
        return teamMemberIds;
      } catch (error) {
        this.logger.error(`Error getting team members for team ${teamId}:`, error);
        return [];
      }
    }
    
    // Debug helper to see the current state of connections
    getConnectionStatus(): any {
      return {
        totalSockets: Array.from(this.userSockets.entries()).reduce((acc, [_, sockets]) => acc + sockets.length, 0),
        connectedUsers: this.userSockets.size,
        userTeamCount: this.userTeams.size,
        notificationQueueSize: Array.from(this.notificationQueue.entries()).reduce((acc, [_, queue]) => acc + queue.length, 0),
        userSocketDetails: Array.from(this.userSockets.entries()).map(([userId, sockets]) => ({
          userId,
          socketCount: sockets.length,
          teams: Array.from(this.userTeams.get(userId) || [])
        }))
      };
    }
    
    // Clean up resources on module destruction
    onModuleDestroy() {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      if (this.notificationQueueTimer) {
        clearInterval(this.notificationQueueTimer);
      }
    }
  }