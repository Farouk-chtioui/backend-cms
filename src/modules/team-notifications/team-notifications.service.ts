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
      console.log('Created notification:', savedNotification);
      
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
        console.log(`Sending direct notification to admin user: ${data.userId}`);
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
    console.log(`Looking up notifications for user ID: ${userId}`);
    
    try {
      // Check if userId is valid
      if (!userId) {
        console.log('Invalid userId provided');
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
      
      console.log(`Found ${notifications.length} notifications using standard query`);
      
      // If that fails, try querying all and filtering manually
      if (notifications.length === 0) {
        console.log('No notifications found with direct query, trying string comparison...');
        
        // Get all notifications
        const allNotifications = await this.teamNotificationModel
          .find()
          .sort({ createdAt: -1 })
          .exec();
        
        console.log(`Total notifications in DB: ${allNotifications.length}`);
        
        // Manually filter by comparing IDs as strings
        notifications = allNotifications.filter(notification => {
          // Convert whatever type to string for comparison
          const notificationUserId = String(notification.userId);
          return notificationUserId === userId;
        });
        
        console.log(`Found ${notifications.length} notifications after string comparison filtering`);
        
        // If still no results, dump some example data for debugging
        if (notifications.length === 0 && allNotifications.length > 0) {
          const sampleNotif = allNotifications[0];
          console.log('Sample notification for debugging:');
          console.log(`- _id: ${sampleNotif._id} (${typeof sampleNotif._id})`);
          console.log(`- userId: ${sampleNotif.userId} (${typeof sampleNotif.userId})`);
          console.log(`- Looking for userId: ${userId} (${typeof userId})`);
          console.log(`- String comparison: "${String(sampleNotif.userId)}" === "${userId}" => ${String(sampleNotif.userId) === userId}`);
        }
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
    console.log(`Looking up notifications for team ID: ${teamId}`);
    
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
      
      console.log(`Found ${notifications.length} notifications for team ${teamId}`);
      return notifications;
    } catch (error) {
      console.error(`Error fetching notifications for team ${teamId}:`, error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<TeamNotification> {
    console.log(`Marking notification as read: ${notificationId}`);
    
    try {
      const notification = await this.teamNotificationModel
        .findByIdAndUpdate(notificationId, { read: true }, { new: true })
        .exec();
      
      if (!notification) {
        throw new Error(`Notification with ID ${notificationId} not found`);
      }
      
      console.log(`Notification ${notificationId} marked as read`);
      return notification;
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    console.log(`Marking all notifications as read for user: ${userId}`);
    
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
      
      console.log(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`Error marking all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteAllForTeam(teamId: string): Promise<boolean> {
    console.log(`Deleting all notifications for team: ${teamId}`);
    
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
      
      console.log(`Deleted ${result.deletedCount} notifications for team ${teamId}`);
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting notifications for team ${teamId}:`, error);
      throw error;
    }
  }
}