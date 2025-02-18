import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetScreensService } from './widget-screen.service';
import { WidgetScreensController } from './widget-screen.controller';
import { WidgetScreen, WidgetScreenSchema } from './widget-screen.schema';
import { WidgetsModule } from '../widgets/widgets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WidgetScreen.name, schema: WidgetScreenSchema },
    ]),
    WidgetsModule,
  ],
  controllers: [WidgetScreensController],
  providers: [WidgetScreensService],
  exports: [WidgetScreensService], 
})
export class WidgetScreensModule {}