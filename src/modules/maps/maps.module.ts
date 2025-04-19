import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { Map, MapSchema } from './maps.schema';
import { MobileApp, MobileAppSchema } from '../mobile-app/mobile-app.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Map.name, schema: MapSchema },
      { name: MobileApp.name, schema: MobileAppSchema },
    ]),
  ],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}