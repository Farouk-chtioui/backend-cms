import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppBuildNotificationsService } from './app-build-notifications.service';
import { AppBuildNotificationsGateway } from './app-build-notifications.gateway';
import { AppBuildNotificationsController } from './app-build-notifications.controller';
import { AppBuildNotification, AppBuildNotificationSchema } from './app-build-notifications.schema';
import { UsersModule } from '../users/users.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppBuildNotification.name, schema: AppBuildNotificationSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => RepositoriesModule),
  ],
  providers: [AppBuildNotificationsService, AppBuildNotificationsGateway],
  controllers: [AppBuildNotificationsController],
  exports: [AppBuildNotificationsService, AppBuildNotificationsGateway],
})
export class AppBuildNotificationsModule {}
