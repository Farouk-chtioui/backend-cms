import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileAppService } from './mobile-app.service';
import { MobileAppController } from './mobile-app.controller';
import { MobileApp, MobileAppSchema } from './mobile-app.schema';
import { AppDesignModule } from '../appDesign/appDesign.module';
import { AppLayoutModule } from '../appLayout/appLayout.module'; // Import AppLayoutModule
import { AppGenerationModule } from '../app-generation/app-generation.module';
import { AppLayoutSchema } from '../appLayout/appLayout.schema';
import { ScreenModule } from '../screen/screen.module'; // New import
import { OnboardingScreensModule } from '../onboarding-screens/onboardingscreens.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MobileApp.name, schema: MobileAppSchema }]),
    MongooseModule.forFeature([{ name: 'AppLayout', schema: AppLayoutSchema }]),
    forwardRef(() => AppDesignModule), // Resolve circular dependencies with AppDesignModule
    forwardRef(() => AppLayoutModule), // Import AppLayoutModule for AppLayout model
    AppGenerationModule, // AppGenerationModule for app generation services
    ScreenModule,  // Add ScreenModule to access ScreenService
    OnboardingScreensModule, // Add OnboardingScreensModule to access OnboardingScreensService
  ],
  controllers: [MobileAppController],
  providers: [MobileAppService],
  exports: [MobileAppService],
})
export class MobileAppModule {}
