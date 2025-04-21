// team-notifications.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, Inject, forwardRef } from '@nestjs/common';
  import { TeamsService } from '../teams/teams.service';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // Update this for production
    },
  })
  export class TeamNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(TeamNotificationsGateway.name);
    
    @WebSocketServer()
    server: Server;
  
    constructor(
      @Inject(forwardRef(() => TeamsService))
      private readonly teamsService: TeamsService,
    ) {}
  
    private userSockets: Map<string, string[]> = new Map();
    private userTeams: Map<string, Set<string>> = new Map();
  
    async handleConnection(client: Socket): Promise<void> {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        const sockets = this.userSockets.get(userId) || [];
        this.userSockets.set(userId, [...sockets, client.id]);
        this.logger.log(`Client connected: ${client.id} for user: ${userId}`);
        
        // When user connects, fetch their team memberships from the database
        // and reinstate them in the socket.io rooms
        await this.fetchAndRejoinUserTeams(userId, client);
      } else {
        this.logger.warn(`Client connected without userId: ${client.id}`);
      }
    }
  
    async fetchAndRejoinUserTeams(userId: string, client: Socket): Promise<void> {
      try {
        // First check our in-memory cache
        const cachedTeams = this.userTeams.get(userId);
        if (cachedTeams && cachedTeams.size > 0) {
          this.logger.log(`Rejoining ${cachedTeams.size} teams for reconnected user ${userId} from cache`);
          cachedTeams.forEach(teamId => {
            client.join(`team-${teamId}`);
            this.logger.log(`User ${userId} rejoined team room: team-${teamId} from cache`);
          });
        }
        
        // Then fetch from database to ensure we have the latest data
        const userTeams = await this.teamsService.getTeamsForUser(userId);
        if (userTeams && userTeams.length > 0) {
          const teamSet = new Set<string>();
          
          userTeams.forEach(team => {
            const teamId = team._id.toString();
            teamSet.add(teamId);
            // Make sure to join even if it was in the cache (in case there are new teams)
            client.join(`team-${teamId}`);
            this.logger.log(`User ${userId} joined team room: team-${teamId} from database`);
          });
          
          // Update the in-memory cache with the latest from DB
          this.userTeams.set(userId, teamSet);
          this.logger.log(`Updated team cache for user ${userId}: now tracking ${teamSet.size} teams`);
        }
      } catch (error) {
        this.logger.error(`Error fetching teams for user ${userId}:`, error);
      }
    }
  
    handleDisconnect(client: Socket): void {
      this.logger.log(`Client disconnected: ${client.id}`);
      
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
          
          // Check if this was the user's last socket
          const remainingSockets = this.userSockets.get(userId) || [];
          if (remainingSockets.length === 0) {
            this.logger.log(`User ${userId} has no more active connections`);
            // Note: We intentionally DON'T remove the userTeams mapping
            // so we can rejoin those rooms on reconnection
          }
          
          break;
        }
      }
      
      // Log details about the disconnection
      if (disconnectedUserId) {
        const userTeams = this.userTeams.get(disconnectedUserId);
        this.logger.log(`User ${disconnectedUserId} disconnected but still tracking ${userTeams?.size || 0} teams for future reconnection`);
      }
    }
  
    @SubscribeMessage('joinTeam')
    async handleJoinTeam(client: Socket, payload: { teamId: string, userId: string }): Promise<void> {
      const { teamId, userId } = payload;
      
      // Join the socket room
      client.join(`team-${teamId}`);
      
      // Track which teams a user is in
      const userTeamSet = this.userTeams.get(userId) || new Set();
      userTeamSet.add(teamId);
      this.userTeams.set(userId, userTeamSet);
      
      this.logger.log(`Client ${client.id} (user ${userId}) joined team room: team-${teamId}`);
      
      // Log all current team memberships for this user
      this.logger.log(`User ${userId} is now in teams: ${Array.from(userTeamSet).join(', ')}`);
      
      // After joining a team, check for any pending notifications
      client.emit('checkPendingNotifications');
      
      // Verify that the user is actually a member of this team in the database
      try {
        const team = await this.teamsService.findTeamById(teamId);
        const isMember = await this.teamsService.checkTeamMembership(team, userId);
        
        if (!isMember) {
          this.logger.warn(`User ${userId} joined team ${teamId} socket room but is not a member in the database!`);
          // We still allow them to join the socket room if they know the teamId
        } else {
          this.logger.log(`Confirmed user ${userId} is a member of team ${teamId} in database`);
        }
      } catch (error) {
        this.logger.error(`Error verifying team membership for user ${userId} in team ${teamId}:`, error);
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
        this.logger.log(`Client ${client.id} (user ${userId}) left team room: team-${teamId}`);
      }
    }
  
    // Add new method to check if a user is a member of a team
    isUserTeamMember(userId: string, teamId: string): boolean {
      const userTeamSet = this.userTeams.get(userId);
      if (userTeamSet && userTeamSet.has(teamId)) {
        this.logger.log(`User ${userId} is a member of team ${teamId}`);
        return true;
      }
      this.logger.log(`User ${userId} is NOT a member of team ${teamId}`);
      return false;
    }
    
    // Add method to get all teams for a user
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
        // Fetch all user's sockets
        const userSockets = this.userSockets.get(userId) || [];
        if (userSockets.length === 0) {
          this.logger.log(`No active connections for user ${userId}, caching teams for future connection`);
        }
  
        // Fetch teams from database
        const userTeams = await this.teamsService.getTeamsForUser(userId);
        if (!userTeams || userTeams.length === 0) {
          this.logger.log(`No teams found for user ${userId} in database`);
          // Clear the cache if no teams found
          this.userTeams.set(userId, new Set());
          return;
        }
        
        // Update the team set in memory
        const teamSet = new Set<string>();
        userTeams.forEach(team => {
          teamSet.add(team._id.toString());
        });
        
        this.userTeams.set(userId, teamSet);
        this.logger.log(`Updated team cache for user ${userId}: now tracking ${teamSet.size} teams`);
        
        // For each socket, join all team rooms
        for (const socketId of userSockets) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            // Leave all existing team rooms first to avoid duplicates
            // This requires the socket.io adapter to support a way to get rooms for a socket
            const currentRooms = Array.from(socket.rooms.values())
              .filter(room => room.startsWith('team-'));
            
            currentRooms.forEach(room => {
              socket.leave(room);
              this.logger.log(`User ${userId} left team room: ${room} for refresh`);
            });
            
            // Join the updated set of team rooms
            teamSet.forEach(teamId => {
              socket.join(`team-${teamId}`);
              this.logger.log(`User ${userId} rejoined team room: team-${teamId} after refresh`);
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error refreshing team memberships for user ${userId}:`, error);
      }
    }
  
    sendNotificationToUser(userId: string, notification: any): boolean {
      const sockets = this.userSockets.get(userId);
      if (sockets && sockets.length) {
        this.logger.log(`Sending notification to user: ${userId} (${sockets.length} active connections)`);
        sockets.forEach(socketId => {
          this.server.to(socketId).emit('notification', notification);
        });
        return true; // Successfully sent notification
      } else {
        // Even if user is not connected, we don't need any special handling
        // The notification is already stored in the database, and will be
        // retrieved when they log in or refresh notifications
        this.logger.log(`User ${userId} not connected, notification stored in database only`);
        return false; // Notification not sent via socket
      }
    }
  
    sendNotificationToTeam(teamId: string, notification: any, excludeUserId?: string): void {
      // First, check if any team members are online
      const teamRoomName = `team-${teamId}`;
      const room = this.server.sockets.adapter.rooms.get(teamRoomName);
      const roomSize = room ? room.size : 0;
      
      this.logger.log(`Sending team notification to team: ${teamId}, room size: ${roomSize}, excluding user: ${excludeUserId}`);
      
      // Include teamId and excludeUserId in the notification
      const enrichedNotification = {
        ...notification,
        teamId,
        excludeUserId
      };
      
      // Keep track of which users would receive this notification
      const notifiedUsers = new Set<string>();
      
      // Broadcast to team room
      this.server.to(teamRoomName).emit('notification', enrichedNotification);
      
      // Track which users are in the room to avoid double sending
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
      
      // Additionally, manually send to any team members who aren't in the room
      // but have this team in their userTeams tracking
      for (const [userId, teams] of this.userTeams.entries()) {
        // Skip the excluded user
        if (userId === excludeUserId) continue;
        
        // Skip users already notified via the room broadcast
        if (roomUsers.has(userId)) continue;
        
        // If user is tracking this team but not in the room, send them the notification directly
        if (teams.has(teamId)) {
          // Get user's sockets
          const userSockets = this.userSockets.get(userId) || [];
          if (userSockets.length > 0) {
            this.logger.log(`Also sending to team member ${userId} who has ${userSockets.length} active connections`);
            userSockets.forEach(socketId => {
              this.server.to(socketId).emit('notification', enrichedNotification);
            });
            notifiedUsers.add(userId);
          } else {
            this.logger.log(`Team member ${userId} is offline, notification will be stored in database`);
            // The notification is stored in the database but we mark this user as notified
            notifiedUsers.add(userId);
          }
        }
      }
      
      this.logger.log(`Notification sent to ${notifiedUsers.size} team members (${Array.from(notifiedUsers).join(", ")})`);
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
        userSocketDetails: Array.from(this.userSockets.entries()).map(([userId, sockets]) => ({
          userId,
          socketCount: sockets.length,
          teams: Array.from(this.userTeams.get(userId) || [])
        }))
      };
    }
  }