import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppBuildNotification } from './app-build-notifications.schema';
import { AppBuildNotificationsGateway } from './app-build-notifications.gateway';
import { UsersService } from '../users/users.service';
import { RepositoriesService } from '../repositories/repositories.service';

@Injectable()
export class AppBuildNotificationsService {
  private readonly logger = new Logger(AppBuildNotificationsService.name);

  constructor(
    @InjectModel(AppBuildNotification.name) private appBuildNotificationModel: Model<AppBuildNotification>,
    private readonly appBuildNotificationsGateway: AppBuildNotificationsGateway,
    @Inject(forwardRef(() => UsersService)) 
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RepositoriesService))
    private readonly repositoriesService: RepositoriesService
  ) {}

  async createNotification(data: {
    userId: string;
    mobileAppId: string;
    repositoryId?: string;
    buildId?: string; // Add buildId for tracking specific builds
    message: string;
    status: 'success' | 'error' | 'progress' | 'info';
    appName?: string;
    appLogo?: string;
    apkUrl?: string;
    qrCodeDataUrl?: string;
  }): Promise<AppBuildNotification> {
    try {
      // Convert to ObjectIds
      const userIdObj = Types.ObjectId.isValid(data.userId) ? new Types.ObjectId(data.userId) : data.userId;
      const mobileAppIdObj = Types.ObjectId.isValid(data.mobileAppId) ? new Types.ObjectId(data.mobileAppId) : data.mobileAppId;
      const repositoryIdObj = data.repositoryId && Types.ObjectId.isValid(data.repositoryId) 
        ? new Types.ObjectId(data.repositoryId) 
        : data.repositoryId;

      // Create notification for the initiating user
      const newNotification = new this.appBuildNotificationModel({
        userId: userIdObj,
        mobileAppId: mobileAppIdObj,
        repositoryId: repositoryIdObj,
        message: data.message,
        status: data.status,
        appName: data.appName,
        appLogo: data.appLogo,
        apkUrl: data.apkUrl,
        qrCodeDataUrl: data.qrCodeDataUrl,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedNotification = await newNotification.save();
      this.logger.log(`Created app build notification: ${savedNotification._id} for user ${data.userId}`);
      
      // Format notification for frontend
      const formattedNotification = this.formatNotification(savedNotification);
      
      // If buildId is provided, send notification to the build-specific room
      if (data.buildId) {
        this.appBuildNotificationsGateway.sendBuildNotification(
          data.buildId,
          formattedNotification
        );
        this.logger.debug(`Sent build notification to build room: ${data.buildId}`);
      } else {
        // Otherwise send via direct socket to the user
        this.appBuildNotificationsGateway.sendNotificationToUser(
          data.userId,
          formattedNotification
        );
      }

      // Notify all repository collaborators if repository ID is provided
      if (data.repositoryId) {
        await this.notifyRepositoryCollaborators(
          data.repositoryId,
          formattedNotification,
          data.userId, // exclude the current user from getting duplicate notifications
          data.buildId // pass buildId for collaborator notifications
        );
      }
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Error creating app build notification: ${error.message}`);
      throw error;
    }
  }

  // Modified method to notify repository collaborators
  private async notifyRepositoryCollaborators(
    repositoryId: string, 
    notification: any, 
    excludeUserId: string,
    buildId?: string // Optional buildId parameter
  ): Promise<void> {
    try {
      // Get repository to find team members
      const repository = await this.repositoriesService.findById(repositoryId);
      if (!repository) {
        this.logger.warn(`Repository with ID ${repositoryId} not found`);
        return;
      }
      
      // Skip if this is a private repository with no team
      if (repository.isPrivate && (!repository.team || repository.team.length === 0)) {
        this.logger.log(`Repository ${repositoryId} is private with no team members, skipping notifications`);
        return;
      }

      // Get owner and team members
      const userIds = new Set<string>();
      
      // Add repository owner - make sure it's a string and handle null case
      if (repository.ownerId) {
        let ownerIdStr: string;
        
        // Handle different types of ownerIds safely
        if (typeof repository.ownerId === 'object' && repository.ownerId !== null) {
          // Check if it's an object with _id property
          const ownerObj = repository.ownerId as any;
          if (ownerObj._id) {
            ownerIdStr = ownerObj._id.toString();
          } else {
            ownerIdStr = ownerObj.toString();
          }
        } else {
          ownerIdStr = String(repository.ownerId || '');
        }
        
        if (ownerIdStr && ownerIdStr !== excludeUserId) {
          userIds.add(ownerIdStr);
          this.logger.debug(`Added owner ID ${ownerIdStr} to notification list`);
        }
      }
      
      // Process team members - this is an array of emails or user IDs
      if (repository.team && Array.isArray(repository.team) && repository.team.length > 0) {
        // Track existing user IDs to avoid duplicate processing
        const processedUserIds = new Set<string>([excludeUserId]);
        
        for (const member of repository.team as any[]) {
          try {
            // Skip if we can't process this member
            if (!member) continue;
            
            // Check if member is an email (string with @)
            if (typeof member === 'string' && member.indexOf('@') !== -1) {
              // Look up user by email
              try {
                const user = await this.usersService.findOneByEmail(member);
                if (user && user._id) {
                  const userId = user._id.toString();
                  // Check if we've already processed this user or if it's the excluded user
                  if (!processedUserIds.has(userId)) {
                    processedUserIds.add(userId);
                    userIds.add(userId);
                    this.logger.debug(`Found user ID ${userId} for email ${member}`);
                  }
                }
              } catch (emailError) {
                this.logger.warn(`Could not find user by email ${member}: ${emailError.message}`);
              }
            } else {
              // Handle direct user IDs - make sure it's a string
              let userId: string;
              
              if (typeof member === 'object' && member !== null) {
                const memberObj = member as any;
                if (memberObj._id) {
                  userId = memberObj._id.toString();
                } else {
                  userId = memberObj.toString();
                }
              } else {
                userId = String(member);
              }
              
              // Check if we've already processed this user or if it's the excluded user
              if (userId && !processedUserIds.has(userId)) {
                processedUserIds.add(userId);
                userIds.add(userId);
                this.logger.debug(`Added user ID ${userId} from team list`);
              }
            }
          } catch (memberError) {
            this.logger.error(`Error processing team member: ${memberError.message}`);
          }
        }
      }
      
      this.logger.log(`Found ${userIds.size} collaborators to notify for repository ${repositoryId}`);
      
      // Find any admin users who aren't already in the notification list
      try {
        const adminUsers = await this.usersService.findAdminUsers();
        for (const admin of adminUsers) {
          const adminId = admin._id.toString();
          if (adminId !== excludeUserId && !userIds.has(adminId)) {
            userIds.add(adminId);
            this.logger.debug(`Added admin user ${adminId} to notifications`);
          }
        }
      } catch (error) {
        this.logger.error(`Error finding admin users: ${error.message}`);
      }
      
      // Create and send notifications for each collaborator
      for (const userIdValue of userIds) {
        try {
          // Safety check to ensure we have a valid string
          if (!userIdValue) {
            this.logger.warn('Encountered invalid user ID, skipping notification');
            continue;
          }
          
          // Ensure userIdValue is a string, not an object
          let userIdStr: string;
          
          if (typeof userIdValue === 'object' && userIdValue !== null) {
            const userObj = userIdValue as any;
            if (userObj._id) {
              userIdStr = userObj._id.toString();
            } else {
              userIdStr = userObj.toString();
            }
          } else {
            userIdStr = String(userIdValue);
          }
            
          this.logger.debug(`Creating notification for user ID: ${userIdStr}`);
          
          // Create a new notification object
          const collaboratorNotification = new this.appBuildNotificationModel({
            userId: userIdStr, // Ensure it's a string
            mobileAppId: notification.mobileAppId,
            repositoryId: notification.repositoryId,
            message: notification.message,
            status: notification.status,
            appName: notification.appName,
            appLogo: notification.appLogo,
            apkUrl: notification.apkUrl,
            qrCodeDataUrl: notification.qrCodeDataUrl,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Save notification to database
          const savedNotification = await collaboratorNotification.save();
          
          // Format notification for frontend
          const formattedNotification = this.formatNotification(savedNotification);
          
          // If buildId is provided, send to the build-specific room
          if (buildId) {
            // We don't subscribe collaborators automatically to the build
            // This will go to their pending notifications
            this.appBuildNotificationsGateway.sendNotificationToUser(userIdStr, formattedNotification);
          } else {
            // Regular notification for collaborators
            this.appBuildNotificationsGateway.sendNotificationToUser(userIdStr, formattedNotification);
          }
        } catch (notifyError) {
          this.logger.error(`Error notifying user ${typeof userIdValue === 'object' ? 'Object' : userIdValue}: ${notifyError.message}`);
        }
      }
      
      this.logger.log(`Successfully notified ${userIds.size} repository collaborators about app build`);
    } catch (error) {
      this.logger.error(`Error notifying repository collaborators: ${error.message}`);
    }
  }

  // Helper method to format notification for frontend
  public formatNotification(notification: AppBuildNotification): any {
    return {
      id: notification._id.toString(),
      _id: notification._id.toString(),
      userId: notification.userId.toString(),
      mobileAppId: notification.mobileAppId.toString(),
      repositoryId: notification.repositoryId?.toString(),
      message: notification.message,
      status: notification.status,
      appName: notification.appName || 'Mobile App',
      appLogo: notification.appLogo,
      apkUrl: notification.apkUrl,
      qrCodeDataUrl: notification.qrCodeDataUrl,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString()
    };
  }

  // Rest of the methods remain unchanged
  async getNotificationsByUser(userId: string): Promise<AppBuildNotification[]> {
    this.logger.log(`Fetching build notifications for user ID: ${userId}`);
    
    try {
      // Create a query that works for both string and ObjectId
      let userIdQuery;
      
      if (Types.ObjectId.isValid(userId)) {
        const userIdObj = new Types.ObjectId(userId);
        userIdQuery = { $in: [userId, userIdObj] };
      } else {
        userIdQuery = userId;
      }
      
      // Query notifications
      const notifications = await this.appBuildNotificationModel
        .find({ userId: userIdQuery })
        .sort({ createdAt: -1 })
        .exec();
      
      this.logger.log(`Found ${notifications.length} build notifications for user ${userId}`);
      return notifications;
    } catch (error) {
      this.logger.error(`Error fetching build notifications for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<AppBuildNotification> {
    this.logger.log(`Marking build notification as read: ${notificationId}`);
    
    try {
      const notification = await this.appBuildNotificationModel
        .findByIdAndUpdate(notificationId, { read: true }, { new: true })
        .exec();
      
      if (!notification) {
        throw new Error(`Build notification with ID ${notificationId} not found`);
      }
      
      this.logger.log(`Build notification ${notificationId} marked as read`);
      return notification;
    } catch (error) {
      this.logger.error(`Error marking build notification ${notificationId} as read: ${error.message}`);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    this.logger.log(`Marking all build notifications as read for user: ${userId}`);
    
    try {
      let userIdQuery;
      
      if (Types.ObjectId.isValid(userId)) {
        const userIdObj = new Types.ObjectId(userId);
        userIdQuery = { $in: [userId, userIdObj] };
      } else {
        userIdQuery = userId;
      }
      
      const result = await this.appBuildNotificationModel
        .updateMany(
          { userId: userIdQuery, read: false },
          { read: true }
        )
        .exec();
      
      this.logger.log(`Marked ${result.modifiedCount} build notifications as read for user ${userId}`);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Error marking all build notifications as read for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async deleteByMobileAppId(mobileAppId: string): Promise<boolean> {
    this.logger.log(`Deleting all build notifications for mobile app: ${mobileAppId}`);
    
    try {
      let mobileAppIdQuery;
      
      if (Types.ObjectId.isValid(mobileAppId)) {
        const mobileAppIdObj = new Types.ObjectId(mobileAppId);
        mobileAppIdQuery = { $in: [mobileAppId, mobileAppIdObj] };
      } else {
        mobileAppIdQuery = mobileAppId;
      }
      
      const result = await this.appBuildNotificationModel
        .deleteMany({ mobileAppId: mobileAppIdQuery })
        .exec();
      
      this.logger.log(`Deleted ${result.deletedCount} build notifications for mobile app ${mobileAppId}`);
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Error deleting build notifications for mobile app ${mobileAppId}: ${error.message}`);
      throw error;
    }
  }
}
