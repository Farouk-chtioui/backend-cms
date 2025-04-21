import { Controller, Get, Post, Param, Body, Logger, InternalServerErrorException } from '@nestjs/common';
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
}
