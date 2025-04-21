// team-notifications.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamNotification, TeamNotificationSchema } from './team-notifications.schema';
import { TeamNotificationsService } from './team-notifications.service';
import { TeamNotificationsController } from './team-notifications.controller';
import { TeamNotificationsGateway } from './team-notifications.gateway';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamNotification.name, schema: TeamNotificationSchema },
    ]),
    // Use forwardRef to break circular dependency
    forwardRef(() => TeamsModule),
  ],
  controllers: [TeamNotificationsController],
  providers: [TeamNotificationsService, TeamNotificationsGateway],
  exports: [TeamNotificationsService, TeamNotificationsGateway], // Export TeamNotificationsGateway as well
})
export class TeamNotificationsModule {}