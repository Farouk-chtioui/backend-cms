import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Screen, ScreenSchema } from './screen.schema';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Screen.name, schema: ScreenSchema }]),
  ],
  controllers: [ScreenController],
  providers: [ScreenService],
  exports: [ScreenService],
})
export class ScreenModule {}
