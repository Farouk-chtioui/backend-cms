import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileAppService } from './mobile-app.service';
import { MobileAppController } from './mobile-app.controller';
import { MobileApp, MobileAppSchema } from './mobile-app.schema';
import { AppDesignModule } from '../appDesign/appDesign.module'; // Import AppDesignModule
import { AppGenerationModule } from '../app-generation/app-generation.module'; // Import AppGenerationModule

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MobileApp.name, schema: MobileAppSchema }]),
    forwardRef(() => AppDesignModule), // Ensure AppDesignModule is imported
    AppGenerationModule, // Ensure AppGenerationModule is imported
  ],
  controllers: [MobileAppController],
  providers: [MobileAppService],
  exports: [MobileAppService],
})
export class MobileAppModule {}