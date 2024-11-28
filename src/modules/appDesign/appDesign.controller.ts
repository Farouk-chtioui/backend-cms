// src/app-design/app-design.controller.ts
import { Controller, Post, Get, Put, Param, Body } from '@nestjs/common';
import { AppDesignService } from './appDesign.service';
import { AppDesign } from './appDesign.schema';

@Controller('app-design')
export class AppDesignController {
  constructor(private readonly appDesignService: AppDesignService) {}

  // Create AppDesign
  @Post()
    async createAppDesign(): Promise<AppDesign> {
        return this.appDesignService.createAppDesign();
    }

 

  @Put(':id')
  async updateAppDesign(
    @Param('id') designId: string,
    @Body() designData: Partial<AppDesign>
  ): Promise<AppDesign> {
    return this.appDesignService.updateAppDesign(designId, designData);
  }
}
