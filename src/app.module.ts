import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { MobileAppModule } from './modules/mobile-app/mobile-app.module';
import { LiveUpdatesGateway } from './live-updates/live-updates.gateway';
import { AppLayoutModule } from './modules/appLayout/appLayout.module';
import { ScreenModule } from './modules/screen/screen.module';
import { OnboardingScreensModule } from './modules/onboarding-screens/onboardingscreens.module';
import { ImagesModule } from './modules/images/images.module';
import { WidgetModule } from './modules/widget/widget.module';
import { WidgetScreenModule } from './modules/widgetscreen/widgetscreen.module';
import { HeaderModule } from './modules/header/header.module';
import { ImageKitService } from './shared/imagekit.service';
import { EditorialPagesModule } from './modules/editorial-pages/editorial-pages.module';
import { MapsModule } from './modules/maps/maps.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TeamNotificationsModule } from './modules/team-notifications/team-notifications.module';
import { FcmModule } from './modules/FCM/fcm.module';
import { AppBuildNotificationsModule } from './modules/app-build-notifications/app-build-notifications.module';
import { TagModule } from './modules/tag/tag.module'; // Import TagModule
import { ActivityModule } from './modules/activity/activity.module'; // Import ActivityModule

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI, {
      connectionFactory: (connection) => {
        connection.on('connected', () => {
          console.log('MongoDB connection established successfully');
        });
        connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });
        return connection;
      },
      // Add connection options for reliability
      socketTimeoutMS: 45000,
      connectTimeoutMS: 45000,
      serverSelectionTimeoutMS: 45000,
      heartbeatFrequencyMS: 30000,
      maxPoolSize: 10,
      retryAttempts: 5,
      retryDelay: 5000,
    }),
    UsersModule,
    AuthModule,
    RepositoriesModule,
    MobileAppModule,
    AppLayoutModule, 
    ScreenModule,
    OnboardingScreensModule,
    ImagesModule,
    WidgetModule,
    WidgetScreenModule,
    HeaderModule,
    EditorialPagesModule,
    MapsModule,
    TeamsModule,
    FcmModule,
    TeamNotificationsModule,
    AppBuildNotificationsModule,
    TagModule, // Add TagModule to the imports
    ActivityModule, // Add ActivityModule to the imports
  ],
  providers: [LiveUpdatesGateway, ImageKitService],
})
export class AppModule {}