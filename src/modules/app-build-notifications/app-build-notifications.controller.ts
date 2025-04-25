import { Controller, Get, Post, Param, Body, Logger, InternalServerErrorException, Query } from '@nestjs/common';
import { AppBuildNotificationsService } from './app-build-notifications.service';

@Controller('app-build-notifications')
export class AppBuildNotificationsController {
  private readonly logger = new Logger(AppBuildNotificationsController.name);
  
  constructor(
    private readonly appBuildNotificationsService: AppBuildNotificationsService
  ) {}

  @Get('user/:userId')
  async getUserNotifications(@Param('userId') userId: string) {
    try {
      this.logger.log(`Fetching build notifications for user ${userId}`);
      return await this.appBuildNotificationsService.getNotificationsByUser(userId);
    } catch (error) {
      this.logger.error(`Error fetching build notifications: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch build notifications', error.message);
    }
  }

  @Post('read/:id')
  async markAsRead(@Param('id') id: string) {
    try {
      this.logger.log(`Marking build notification ${id} as read`);
      return await this.appBuildNotificationsService.markAsRead(id);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
      throw new InternalServerErrorException('Failed to mark notification as read', error.message);
    }
  }

  @Post('read-all/:userId')
  async markAllAsRead(@Param('userId') userId: string) {
    try {
      this.logger.log(`Marking all build notifications as read for user ${userId}`);
      return await this.appBuildNotificationsService.markAllAsRead(userId);
    } catch (error) {
      this.logger.error(`Error marking all notifications as read: ${error.message}`);
      throw new InternalServerErrorException('Failed to mark all notifications as read', error.message);
    }
  }
  
  @Post('create')
  async createBuildNotification(@Body() notificationData: {
    userId: string;
    mobileAppId: string;
    repositoryId?: string;
    buildId?: string;
    message: string;
    status: 'success' | 'error' | 'progress' | 'info';
    appName?: string;
    appLogo?: string;
    apkUrl?: string;
    qrCodeDataUrl?: string;
  }) {
    try {
      this.logger.log(`Creating build notification for user ${notificationData.userId}`);
      
      // Add buildId if present to enable socket room notifications
      if (notificationData.buildId) {
        this.logger.log(`Notification associated with build ${notificationData.buildId}`);
      }
      
      const notification = await this.appBuildNotificationsService.createNotification(notificationData);
      return {
        success: true,
        notification: this.appBuildNotificationsService.formatNotification(notification)
      };
    } catch (error) {
      this.logger.error(`Error creating build notification: ${error.message}`);
      throw new InternalServerErrorException('Failed to create build notification', error.message);
    }
  }
  
  @Get('status')
  async getConnectionStatus() {
    try {
      // This is a maintenance/debugging endpoint to check the notification system status
      const gateway = this.appBuildNotificationsService['appBuildNotificationsGateway'];
      if (gateway && typeof gateway.getConnectionStatus === 'function') {
        return gateway.getConnectionStatus();
      }
      return { error: 'Gateway status unavailable' };
    } catch (error) {
      this.logger.error(`Error fetching gateway status: ${error.message}`);
      throw new InternalServerErrorException('Failed to get notification system status');
    }
  }
  
  @Post('delete-app/:mobileAppId')
  async deleteAppNotifications(@Param('mobileAppId') mobileAppId: string) {
    try {
      this.logger.log(`Deleting all build notifications for mobile app ${mobileAppId}`);
      const result = await this.appBuildNotificationsService.deleteByMobileAppId(mobileAppId);
      return { success: result };
    } catch (error) {
      this.logger.error(`Error deleting app notifications: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete app notifications', error.message);
    }
  }
}
