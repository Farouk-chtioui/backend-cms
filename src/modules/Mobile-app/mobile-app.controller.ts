import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { MobileApp } from './mobile-app.schema';

@Controller('mobile-apps')
export class MobileAppController {
  constructor(private readonly mobileAppService: MobileAppService) {}

  @Post()
  async createMobileApp(@Body('name') appName: string): Promise<MobileApp> {
    return this.mobileAppService.createMobileApp(appName);
  }

  @Put(':id/design')
  async updateAppDesign(
    @Param('id') appId: string,
    @Body() designData: any
  ): Promise<MobileApp> {
    return this.mobileAppService.updateAppDesign(appId, designData);
  }
}