import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { Activity, ActivityType } from './activity.schema';
import { CurrentUserService } from './current-user.service';
import { Types } from 'mongoose';

@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly currentUserService: CurrentUserService
  ) {}

  @Get('mobile-app/:mobileAppId')
  async getActivitiesByMobileAppId(
    @Param('mobileAppId') mobileAppId: string,
    @Request() req
  ): Promise<Activity[]> {
    // Try to extract user information from request if it exists
    try {
      if (req.user) {
        const user = {
          userId: req.user.id || req.user._id || req.user.sub,
          username: req.user.username,
          email: req.user.email
        };
        
        // Set the current user context
        this.currentUserService.setUser(user);
      } else if (req.headers) {
        // Try to extract user info from headers
        const user = {
          userId: req.headers['x-user-id'],
          username: req.headers['x-user-name'],
          email: req.headers['x-user-email']
        };
        
        if (user.username || user.email) {
          this.currentUserService.setUser(user);
        }
      }
    } catch (error) {
      console.log('Could not extract user from request:', error.message);
    }
    
    // Get activities for the mobile app
    const activities = await this.activityService.findByMobileAppId(mobileAppId);
    
    // If we can get user information from request, update activities with unknown users
    const currentUser = this.currentUserService.getUser();
    
    if (currentUser && (currentUser.username || currentUser.email)) {
      const updatedActivities = [];
      for (const activity of activities) {
        if (!activity.username || activity.username === 'unknown') {
          // Update activity with current user info
          const updatedActivity = await this.activityService.updateActivity(
            activity._id.toString(),
            {
              username: currentUser.username || 'unknown',
              userEmail: currentUser.email || 'unknown'
            }
          );
          updatedActivities.push(updatedActivity);
        } else {
          updatedActivities.push(activity);
        }
      }
      return updatedActivities;
    }
    
    return activities;
  }

  @Post('create')
  async createActivity(
    @Body() activityData: {
      mobileAppId: string;
      activityType: ActivityType;
      description: string;
      username?: string;
      userEmail?: string;
      userId?: string;
      metadata?: Record<string, any>;
    },
    @Request() req
  ): Promise<Activity> {
    // Set user context from request body or headers
    try {
      const user = {
        userId: activityData.userId || req.headers['x-user-id'] || req.user?.id,
        username: activityData.username || req.headers['x-user-name'] || req.user?.username,
        email: activityData.userEmail || req.headers['x-user-email'] || req.user?.email
      };
      
      if (user.username || user.email) {
        this.currentUserService.setUser(user);
      }
    } catch (error) {
      console.log('Could not set user context:', error.message);
    }

    return this.activityService.create({
      mobileAppId: new Types.ObjectId(activityData.mobileAppId),
      activityType: activityData.activityType,
      description: activityData.description,
      username: activityData.username || 'unknown',
      userEmail: activityData.userEmail || 'unknown',
      metadata: activityData.metadata || {}
    });
  }

  @Post('publish')
  async recordPublishActivity(
    @Body() data: {
      mobileAppId: string;
      metadata?: Record<string, any>;
    },
    @Request() req
  ): Promise<Activity> {
    // Extract user info from request
    this.extractUserFromRequest(req);
    
    return this.activityService.recordPublishActivity(
      data.mobileAppId,
      undefined, // Let service get from CurrentUserService
      undefined, // Let service get from CurrentUserService
      data.metadata || {}
    );
  }

  @Post('build')
  async recordBuildActivity(
    @Body() data: {
      mobileAppId: string;
      metadata?: Record<string, any>;
    },
    @Request() req
  ): Promise<Activity> {
    // Extract user info from request
    this.extractUserFromRequest(req);
    
    return this.activityService.recordBuildActivity(
      data.mobileAppId,
      undefined, // Let service get from CurrentUserService
      undefined, // Let service get from CurrentUserService
      data.metadata || {}
    );
  }

  @Post('update')
  async recordUpdateActivity(
    @Body() data: {
      mobileAppId: string;
      description: string;
      metadata?: Record<string, any>;
    },
    @Request() req
  ): Promise<Activity> {
    // Extract user info from request
    this.extractUserFromRequest(req);
    
    return this.activityService.recordUpdateActivity(
      data.mobileAppId,
      undefined, // Let service get from CurrentUserService
      undefined, // Let service get from CurrentUserService
      data.description,
      data.metadata || {}
    );
  }

  private extractUserFromRequest(req: any): void {
    try {
      let user = null;

      // Try from JWT user first
      if (req.user) {
        user = {
          userId: req.user.id || req.user._id || req.user.sub,
          username: req.user.username,
          email: req.user.email
        };
      } 
      // Try from headers
      else if (req.headers) {
        user = {
          userId: req.headers['x-user-id'],
          username: req.headers['x-user-name'],
          email: req.headers['x-user-email']
        };
      }
      // Try from body if it exists
      else if (req.body) {
        user = {
          userId: req.body.userId,
          username: req.body.username,
          email: req.body.userEmail
        };
      }

      if (user && (user.username || user.email)) {
        this.currentUserService.setUser(user);
        console.log('Set user context:', user);
      }
    } catch (error) {
      console.log('Could not extract user from request:', error.message);
    }
  }
}