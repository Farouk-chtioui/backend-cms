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
import { ImageKitService } from './shared/imagekit.service';
import { HeaderModule } from './modules/header/header.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
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
    HeaderModule, // Added HeaderModule
  ],
  providers: [LiveUpdatesGateway, ImageKitService],
})
export class AppModule {}