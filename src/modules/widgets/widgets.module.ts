import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';
import { Widget, WidgetSchema } from './widget.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Widget.name, schema: WidgetSchema },
    ]),
  ],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService],
})
export class WidgetsModule {}