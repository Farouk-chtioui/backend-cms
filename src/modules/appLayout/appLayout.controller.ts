import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { AppLayoutService } from './appLayout.service';
import { CreateAppLayoutDto, UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Controller('app-layout')
export class AppLayoutController {
  constructor(private readonly appLayoutService: AppLayoutService) {}

  /**
   * Get or create default layout.
   */
  @Get('default')
  async getOrCreateDefaultLayout() {
    return this.appLayoutService.getOrCreateDefaultLayout();
  }

  /**
   * Create a default layout.
   */
  @Post('default')
  async createDefaultLayout() {
    return this.appLayoutService.createDefaultLayout();
  }

  /**
   * Update an existing layout.
   */
  @Put(':id')
  async updateLayout(@Param('id') layoutId: string, @Body() layoutData: UpdateAppLayoutDto) {
    return this.appLayoutService.updateLayout(layoutId, layoutData);
  }

  /**
   * Reset layout to default.
   */
  @Post('reset/:id')
  async resetLayoutToDefault(@Param('id') layoutId: string) {
    return this.appLayoutService.resetLayoutToDefault(layoutId);
  }
}
