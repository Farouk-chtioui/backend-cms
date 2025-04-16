import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileAppService } from './mobile-app.service';
import { MobileAppController } from './mobile-app.controller';
import { MobileApp, MobileAppSchema } from './mobile-app.schema';
import { AppDesign, AppDesignSchema } from '../appDesign/appDesign.schema';
import { AppDesignModule } from '../appDesign/appDesign.module';
import { AppLayoutModule } from '../appLayout/appLayout.module';
import { AppGenerationModule } from '../app-generation/app-generation.module';
import { AppLayoutSchema } from '../appLayout/appLayout.schema';
import { ScreenModule } from '../screen/screen.module';
import { OnboardingScreensModule } from '../onboarding-screens/onboardingscreens.module';
import { Repository, RepositorySchema } from '../Repositories/repository.schema';
import { ImageKitService } from '../../shared/imagekit.service';
import { WidgetModule } from '../widget/widget.module';
import { WidgetSchema } from '../widget/schemas/widget.schema';
<<<<<<< HEAD
=======

// IMPORT your WidgetScreenModule here:
import { WidgetScreenModule } from '../widgetscreen/widgetscreen.module'; // Adjust path as needed
>>>>>>> 8f8dad58a824b47aa65497cdf5367b309a42588f

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MobileApp.name, schema: MobileAppSchema },
      { name: AppDesign.name, schema: AppDesignSchema },
      { name: 'AppLayout', schema: AppLayoutSchema },
      { name: Repository.name, schema: RepositorySchema },
<<<<<<< HEAD
      { name: 'Widget', schema: WidgetSchema }, // Directly register the Widget model
=======
      { name: 'Widget', schema: WidgetSchema },
>>>>>>> 8f8dad58a824b47aa65497cdf5367b309a42588f
    ]),
    forwardRef(() => AppDesignModule),
    forwardRef(() => AppLayoutModule),
    AppGenerationModule,
    ScreenModule,
    OnboardingScreensModule,
    WidgetModule,
<<<<<<< HEAD
=======

    // Add WidgetScreenModule so MobileAppModule sees the WidgetScreenService
    WidgetScreenModule,
>>>>>>> 8f8dad58a824b47aa65497cdf5367b309a42588f
  ],
  controllers: [MobileAppController],
  providers: [
    MobileAppService,
    ImageKitService,
  ],
  exports: [MobileAppService],
})
export class MobileAppModule {}
