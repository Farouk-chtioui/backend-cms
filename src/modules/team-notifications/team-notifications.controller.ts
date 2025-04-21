// team-notifications.controller.ts
import { Controller, Get, Put, Delete, Param, Query, HttpException, HttpStatus, Optional, Inject, forwardRef } from '@nestjs/common';
import { TeamNotificationsService } from './team-notifications.service';
import { TeamsService } from '../teams/teams.service';
import { Types } from 'mongoose';

@Controller('team-notifications')
export class TeamNotificationsController {
  constructor(
    private readonly teamNotificationsService: TeamNotificationsService,
    @Optional() @Inject(forwardRef(() => TeamsService)) private readonly teamsService?: TeamsService
  ) {}

  // Helper method to try to get team name
  private async getTeamName(teamId: string): Promise<string> {
    if (!this.teamsService) return 'Team';
    
    try {
      const team = await this.teamsService.findTeamById(teamId);
      return team?.name || 'Team';
    } catch (error) {
      console.error(`Error getting team name for ID ${teamId}:`, error.message);
      return 'Team';
    }
  }

  @Get('debug/:userId')
  async debugNotifications(@Param('userId') userId: string) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }
      
      console.log(`DEBUG: Fetching raw notifications for user: ${userId}`);
      
      // Get raw notifications from database
      const rawNotifications = await this.teamNotificationsService.getNotificationsByUser(userId);
      
      // Get formatted notifications
      const formattedNotifications = await Promise.all(
        rawNotifications.map(async (notification) => {
          const teamName = await this.getTeamName(notification.teamId.toString());
          return this.teamNotificationsService.formatNotification(notification, teamName);
        })
      );
      
      // Return both raw and formatted for comparison
      return {
        raw: rawNotifications.map(n => ({
          ...n.toObject(),
          userId_str: n.userId.toString(),
        })),
        formatted: formattedNotifications,
        count: rawNotifications.length,
        userIdType: typeof userId,
        userIdFormatted: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : 'invalid',
      };
    } catch (error) {
      console.error('Error in debugNotifications:', error);
      throw new HttpException(
        error.message || 'Debug endpoint failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getNotifications(@Query('userId') userId: string) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }
      
      console.log(`Fetching notifications for user: ${userId}`);
      const notifications = await this.teamNotificationsService.getNotificationsByUser(userId);
      console.log(`Found ${notifications.length} notifications for user ${userId}`);
      
      // Format notifications for frontend response
      const formattedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          const teamName = await this.getTeamName(notification.teamId.toString());
          return this.teamNotificationsService.formatNotification(notification, teamName);
        })
      );
      
      console.log(`Returning ${formattedNotifications.length} formatted notifications`);
      return formattedNotifications;
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw new HttpException(
        error.message || 'Failed to fetch notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('team/:teamId')
  async getTeamNotifications(
    @Param('teamId') teamId: string,
    @Query('userId') userId: string
  ) {
    try {
      if (!teamId || !userId) {
        throw new HttpException('teamId and userId are required', HttpStatus.BAD_REQUEST);
      }
      
      console.log(`Fetching team notifications for team: ${teamId}, user: ${userId}`);
      const notifications = await this.teamNotificationsService.getNotificationsByTeam(teamId);
      const teamName = await this.getTeamName(teamId);
      
      // Format notifications for frontend response
      const formattedNotifications = notifications.map(notification => 
        this.teamNotificationsService.formatNotification(notification, teamName)
      );
      
      console.log(`Returning ${formattedNotifications.length} formatted team notifications`);
      return formattedNotifications;
    } catch (error) {
      console.error('Error in getTeamNotifications:', error);
      throw new HttpException(
        error.message || 'Failed to fetch team notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    try {
      console.log(`Marking notification as read: ${id}`);
      const notification = await this.teamNotificationsService.markAsRead(id);
      const teamName = await this.getTeamName(notification.teamId.toString());
      
      return this.teamNotificationsService.formatNotification(notification, teamName);
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw new HttpException(
        error.message || 'Failed to update notification',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('read-all')
  async markAllAsRead(@Query('userId') userId: string) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }
      console.log(`Marking all notifications as read for user: ${userId}`);
      const result = await this.teamNotificationsService.markAllAsRead(userId);
      return { success: result };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      throw new HttpException(
        error.message || 'Failed to update notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('team/:teamId')
  async deleteAllForTeam(@Param('teamId') teamId: string) {
    try {
      console.log(`Deleting all notifications for team: ${teamId}`);
      const result = await this.teamNotificationsService.deleteAllForTeam(teamId);
      return { success: result };
    } catch (error) {
      console.error('Error in deleteAllForTeam:', error);
      throw new HttpException(
        error.message || 'Failed to delete notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}