import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppLayoutService } from './service/appLayout.service';
import { AppLayoutController } from './controller/appLayout.controller';
import { Tab } from './schema/tab.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tab])],
  providers: [AppLayoutService],
  controllers: [AppLayoutController],
})
export class AppLayoutModule {}
