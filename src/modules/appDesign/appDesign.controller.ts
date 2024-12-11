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

  // Get Default AppDesign
  @Get('default')
  async getDefaultAppDesign(): Promise<AppDesign> {
    return this.appDesignService.getDefaultAppDesign();
  }

  // Reset AppDesign
  @Post('reset/:id')
  async resetAppDesign(@Param('id') designId: string): Promise<AppDesign> {
    return this.appDesignService.resetAppDesign(designId);
  }

  // Update AppDesign
  @Put(':id')
  async updateAppDesign(
    @Param('id') designId: string,
    @Body() designData: Partial<AppDesign>,
  ): Promise<AppDesign> {
    return this.appDesignService.updateAppDesign(designId, designData);
  }
}