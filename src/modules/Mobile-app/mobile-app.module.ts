import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileAppService } from './mobile-app.service';
import { MobileApp, MobileAppSchema } from './mobile-app.schema';
import { AppDesignModule } from '../appDesign/appDesign.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MobileApp.name, schema: MobileAppSchema }]),
    AppDesignModule,
  ],
  providers: [MobileAppService],
  exports: [MobileAppService],
})
export class MobileAppModule {}