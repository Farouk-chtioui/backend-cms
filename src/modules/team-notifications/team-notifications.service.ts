// team-notifications.service.ts
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TeamNotification } from './team-notifications.schema';
import { TeamNotificationsGateway } from './team-notifications.gateway';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class TeamNotificationsService {
  constructor(
    @InjectModel(TeamNotification.name) private teamNotificationModel: Model<TeamNotification>,
    private readonly teamNotificationsGateway: TeamNotificationsGateway,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

  async createNotification(data: {
    userId: string; 
    teamId: string;
    message: string;
    type: 'message' | 'note';
    sourceId?: string;
    teamName?: string;
    isAdmin?: boolean;
    senderId?: string; // Add this to keep track of who sent the notification
  }): Promise<TeamNotification> {
    // Ensure we have ObjectId for these fields
    let userIdObj;
    let teamIdObj;
    let sourceIdObj;
    
    try {
      userIdObj = Types.ObjectId.isValid(data.userId) ? new Types.ObjectId(data.userId) : data.userId;
      teamIdObj = Types.ObjectId.isValid(data.teamId) ? new Types.ObjectId(data.teamId) : data.teamId;
      sourceIdObj = data.sourceId && Types.ObjectId.isValid(data.sourceId) ? new Types.ObjectId(data.sourceId) : undefined;
      
      const newNotification = new this.teamNotificationModel({
        userId: userIdObj,
        teamId: teamIdObj,
        message: data.message, 
        type: data.type,
        sourceId: sourceIdObj,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedNotification = await newNotification.save();
      
      // Get team name if not provided
      let teamName = data.teamName;
      if (!teamName) {
        try {
          const team = await this.teamsService.findTeamById(data.teamId);
          teamName = team?.name || 'Team';
        } catch (error) {
          console.error(`Failed to get team name for notification: ${error.message}`);
          teamName = 'Team';
        }
      }
      
      // Format notification for frontend
      const formattedNotification = this.formatNotification(savedNotification, teamName);
      
      // If the user is admin but also the sender, don't send the notification to them
      const isAdminSender = data.isAdmin && data.senderId && data.userId === data.senderId;
      if (data.isAdmin && !isAdminSender) {
        this.teamNotificationsGateway.sendNotificationToUser(
          data.userId,
          formattedNotification
        );
      }
      
      // Broadcast to team members (excluding the sender)
      this.teamNotificationsGateway.sendNotificationToTeam(
        data.teamId,
        formattedNotification,
        data.senderId || data.userId // Exclude the sender (could be admin or regular user)
      );
      
      // Force refresh team memberships to ensure user has access
      await this.teamNotificationsGateway.refreshUserTeamMemberships(data.userId);
      
      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Helper method to format notification for frontend
  public formatNotification(notification: TeamNotification, teamName: string = 'Team'): any {
    return {
      id: notification._id.toString(),
      _id: notification._id.toString(), // Include both for compatibility
      userId: notification.userId.toString(),
      teamId: notification.teamId.toString(),
      message: notification.message,
      type: notification.type,
      sourceId: notification.sourceId?.toString(),
      read: notification.read,
      teamName: teamName || 'Team',
      createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: notification.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  async getNotificationsByUser(userId: string): Promise<TeamNotification[]> {
    try {
      // Check if userId is valid
      if (!userId) {
        return [];
      }
      
      let userIdQuery;
      
      // Create a query that will work for both string and ObjectId fields
      if (Types.ObjectId.isValid(userId)) {
        const userIdObj = new Types.ObjectId(userId);
        userIdQuery = { $in: [userId, userIdObj] };
      } else {
        userIdQuery = userId;
      }
      
      // First try direct query
      let notifications = await this.teamNotificationModel
        .find({ userId: userIdQuery })
        .sort({ createdAt: -1 })
        .exec();
      
      // If that fails, try querying all and filtering manually
      if (notifications.length === 0) {
        // Get all notifications
        const allNotifications = await this.teamNotificationModel
          .find()
          .sort({ createdAt: -1 })
          .exec();
        
        // Manually filter by comparing IDs as strings
        notifications = allNotifications.filter(notification => {
          // Convert whatever type to string for comparison
          const notificationUserId = String(notification.userId);
          return notificationUserId === userId;
        });
      }
      
      // Ensure team memberships are refreshed when fetching notifications
      try {
        await this.teamNotificationsGateway.refreshUserTeamMemberships(userId);
      } catch (error) {
        console.error(`Error refreshing team memberships for user ${userId}:`, error);
      }
      
      return notifications;
    } catch (error) {
      console.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  async getNotificationsByTeam(teamId: string): Promise<TeamNotification[]> {
    try {
      let teamIdQuery;
      
      // Create a query that will work for both string and ObjectId fields
      if (Types.ObjectId.isValid(teamId)) {
        const teamIdObj = new Types.ObjectId(teamId);
        teamIdQuery = { $in: [teamId, teamIdObj] };
      } else {
        teamIdQuery = teamId;
      }
      
      // Query notifications
      const notifications = await this.teamNotificationModel
        .find({ teamId: teamIdQuery })
        .sort({ createdAt: -1 })
        .exec();
      
      return notifications;
    } catch (error) {
      console.error(`Error fetching notifications for team ${teamId}:`, error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<TeamNotification> {
    try {
      const notification = await this.teamNotificationModel
        .findByIdAndUpdate(notificationId, { read: true }, { new: true })
        .exec();
      
      if (!notification) {
        throw new Error(`Notification with ID ${notificationId} not found`);
      }
      
      return notification;
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      let userIdQuery;
      
      // Create a query that will work for both string and ObjectId fields
      if (Types.ObjectId.isValid(userId)) {
        const userIdObj = new Types.ObjectId(userId);
        userIdQuery = { $in: [userId, userIdObj] };
      } else {
        userIdQuery = userId;
      }
      
      const result = await this.teamNotificationModel 
        .updateMany(
          { userId: userIdQuery, read: false },
          { read: true }
        )
        .exec();
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`Error marking all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteAllForTeam(teamId: string): Promise<boolean> {
    try {
      let teamIdQuery;
      
      // Create a query that will work for both string and ObjectId fields
      if (Types.ObjectId.isValid(teamId)) {
        const teamIdObj = new Types.ObjectId(teamId);
        teamIdQuery = { $in: [teamId, teamIdObj] };
      } else {
        teamIdQuery = teamId;
      }
      
      const result = await this.teamNotificationModel
        .deleteMany({ teamId: teamIdQuery })
        .exec();
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting notifications for team ${teamId}:`, error);
      throw error;
    }
  }
}