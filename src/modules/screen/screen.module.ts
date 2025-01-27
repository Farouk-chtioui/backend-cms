import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { Screen, ScreenSchema } from './screen.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Screen.name, schema: ScreenSchema }]),
  ],
  controllers: [ScreenController],
  providers: [ScreenService],
  exports: [ScreenService], // Export ScreenService to make it available to other modules
})
export class ScreenModule {}
