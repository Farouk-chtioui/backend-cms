import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HeaderController } from './header.controller';
import { HeaderService } from './header.service';
import { WidgetScreenSchema } from '../widgetscreen/schemas/widgetscreen.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'WidgetScreen', schema: WidgetScreenSchema }
    ]),
  ],
  controllers: [HeaderController],
  providers: [HeaderService],
  exports: [HeaderService],
})
export class HeaderModule {}