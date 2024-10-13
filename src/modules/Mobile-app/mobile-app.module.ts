import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MobileApp, MobileAppSchema } from './mobile-app.schema';
import { MobileAppService } from './mobile-app.service';
import { MobileAppController } from './mobile-app.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: MobileApp.name, schema: MobileAppSchema }])],
  controllers: [MobileAppController],
  providers: [MobileAppService],
})
export class MobileAppModule {}