import { Controller, Post, Get, Put, Body, Param, Logger } from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';

@Controller('mobile-app')
export class MobileAppController {
  private readonly logger = new Logger(MobileAppController.name);

  constructor(private readonly mobileAppService: MobileAppService) {}

  /**
   * Create a new Mobile App.
   */
  @Post()
  async create(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.create(createMobileAppDto);
  }

  /**
   * Fetch the configuration of a Mobile App.
   */
  @Get(':id/config')
  async getAppConfiguration(@Param('id') appId: string) {
    return this.mobileAppService.getAppConfiguration(appId);
  }

  /**
   * Reset the layout of a Mobile App.
   */
  @Post(':id/layout/reset')
  async resetAppLayout(@Param('id') appId: string) {
    return this.mobileAppService.resetAppLayout(appId);
  }

  /**
   * Update the layout of a Mobile App.
   */
  @Put(':id/layout')
  async updateAppLayout(@Param('id') appId: string, @Body() layoutData: Partial<AppLayout>) {
    return this.mobileAppService.updateAppLayout(appId, layoutData);
  }

  /**
   * Update the design of a Mobile App.
   */
  @Put(':id/design')
  async updateAppDesign(@Param('id') appId: string, @Body() designData: Partial<AppDesign>) {
    return this.mobileAppService.updateAppDesign(appId, designData);
  }

  /**
   * Generate a Mobile App with theme and design.
   */
  @Post('generate')
  async generateAppWithTheme(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.generateAppWithTheme(createMobileAppDto);
  }
}
