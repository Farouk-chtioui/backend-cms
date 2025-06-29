import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityType } from './activity.schema';
import { CurrentUserService } from './current-user.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    private currentUserService: CurrentUserService,
  ) {}

  async create(activityData: Partial<Activity>): Promise<Activity> {
    // Try to get the current user
    const currentUser = this.currentUserService.getUser();
    
    // If username is not provided but we have a current user, use that info
    if ((!activityData.username || activityData.username === 'unknown') && currentUser.username) {
      activityData.username = currentUser.username;
    }
    
    // If userEmail is not provided but we have a current user, use that info
    if ((!activityData.userEmail || activityData.userEmail === 'unknown') && currentUser.email) {
      activityData.userEmail = currentUser.email;
    }
    
    const newActivity = new this.activityModel(activityData);
    return newActivity.save();
  }

  async findByMobileAppId(mobileAppId: string): Promise<Activity[]> {
    return this.activityModel
      .find({ mobileAppId: new Types.ObjectId(mobileAppId) })
      .sort({ timestamp: -1 })
      .exec();
  }

  async recordPublishActivity(
    mobileAppId: string,
    username: string = 'unknown',
    userEmail: string = 'unknown',
    metadata: Record<string, any> = {},
  ): Promise<Activity> {
    // Get current user info if available
    const currentUser = this.currentUserService.getUser();
    username = currentUser.username || username;
    userEmail = currentUser.email || userEmail;
    
    return this.create({
      mobileAppId: new Types.ObjectId(mobileAppId),
      username,
      userEmail,
      activityType: ActivityType.PUBLISH,
      description: `App published by ${username}`,
      metadata,
    });
  }

  async recordBuildActivity(
    mobileAppId: string,
    username: string = 'unknown',
    userEmail: string = 'unknown',
    metadata: Record<string, any> = {},
  ): Promise<Activity> {
    // Get current user info if available
    const currentUser = this.currentUserService.getUser();
    username = currentUser.username || username;
    userEmail = currentUser.email || userEmail;
    
    return this.create({
      mobileAppId: new Types.ObjectId(mobileAppId),
      username,
      userEmail,
      activityType: ActivityType.BUILD,
      description: `App built by ${username}`,
      metadata,
    });
  }

  async recordUpdateActivity(
    mobileAppId: string,
    username: string = 'unknown',
    userEmail: string = 'unknown',
    description: string,
    metadata: Record<string, any> = {},
  ): Promise<Activity> {
    // Get current user info if available
    const currentUser = this.currentUserService.getUser();
    username = currentUser.username || username;
    userEmail = currentUser.email || userEmail;
    
    return this.create({
      mobileAppId: new Types.ObjectId(mobileAppId),
      username,
      userEmail,
      activityType: ActivityType.UPDATE,
      description,
      metadata,
    });
  }

  async updateActivity(
    activityId: string,
    updateData: Partial<Activity>,
  ): Promise<Activity> {
    return this.activityModel
      .findByIdAndUpdate(new Types.ObjectId(activityId), updateData, {
        new: true,
      })
      .exec();
  }
}
