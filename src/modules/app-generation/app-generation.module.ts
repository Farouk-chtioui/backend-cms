import { Module, forwardRef } from '@nestjs/common';
import { AppGenerationService } from './app-generation.service';
import { AppBuildNotificationsModule } from '../app-build-notifications/app-build-notifications.module';

@Module({
  imports: [
    forwardRef(() => AppBuildNotificationsModule)
  ],
  providers: [AppGenerationService],
  exports: [AppGenerationService],
})
export class AppGenerationModule {}