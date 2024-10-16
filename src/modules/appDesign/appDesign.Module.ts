// src/app-design/app-design.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppDesignService } from './appDesign.service';
import { AppDesignController } from './appDesign.controller';
import { AppDesign, AppDesignSchema } from './appDesign.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AppDesign.name, schema: AppDesignSchema }])],
  controllers: [AppDesignController],
  providers: [AppDesignService],
  exports: [AppDesignService, MongooseModule],
})
export class AppDesignModule {}
