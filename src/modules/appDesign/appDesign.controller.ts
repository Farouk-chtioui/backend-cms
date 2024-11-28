import { Controller, Post, Get, Put, Param, Body } from '@nestjs/common';
import { AppDesignService } from './appDesign.service';
import { AppDesign } from './appDesign.schema';

@Controller('app-design')
export class AppDesignController {
  constructor(private readonly appDesignService: AppDesignService) {}

  /**
   * Get or create default design.
   */
  @Get(':id')
  async getOrCreateDesign(@Param('id') designId?: string): Promise<AppDesign> {
    return this.appDesignService.getOrCreateDesign(designId);
  }

  /**
   * Create a default design.
   */
  @Post('default')
  async createDefaultDesign(): Promise<AppDesign> {
    return this.appDesignService.createDefaultDesign();
  }

  /**
   * Update an existing design.
   */
  @Put(':id')
  async updateAppDesign(@Param('id') designId: string, @Body() designData: Partial<AppDesign>): Promise<AppDesign> {
    return this.appDesignService.updateAppDesign(designId, designData);
  }
}
