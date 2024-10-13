import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { MobileApp } from './mobile-app.schema';

@Controller('mobile-apps')
export class MobileAppController {
  constructor(private readonly mobileAppService: MobileAppService) {}

  @Post()
  async createApp(@Body() appData: Partial<MobileApp>): Promise<MobileApp> {
    return this.mobileAppService.createApp(appData);
  }

  @Get(':id')
  async getAppById(@Param('id') appId: string): Promise<MobileApp> {
    return this.mobileAppService.getAppById(appId);
  }

  @Put(':id')
  async updateApp(@Param('id') appId: string, @Body() updateData: Partial<MobileApp>): Promise<MobileApp> {
    return this.mobileAppService.updateApp(appId, updateData);
  }

  @Delete(':id')
  async deleteApp(@Param('id') appId: string): Promise<void> {
    return this.mobileAppService.deleteApp(appId);
  }
}