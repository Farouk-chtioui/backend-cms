import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppLayoutService } from './service/appLayout.service';
import { AppLayoutController } from './controller/appLayout.controller';
import { TabSchema } from './schema/tab.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Tab', schema: TabSchema }])],
  providers: [AppLayoutService],
  controllers: [AppLayoutController],
})
export class AppLayoutModule {}
