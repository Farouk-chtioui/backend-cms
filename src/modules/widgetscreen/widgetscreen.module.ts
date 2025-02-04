import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetScreenSchema } from './schemas/widgetscreen.schema';
import { WidgetScreenService } from './widgetscreen.service';
import { WidgetScreenController } from './widgetscreen.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'WidgetScreen', schema: WidgetScreenSchema }]),
  ],
  controllers: [WidgetScreenController],
  providers: [WidgetScreenService],
})
export class WidgetScreenModule {}
