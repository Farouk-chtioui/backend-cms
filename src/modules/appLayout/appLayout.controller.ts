import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { AppLayoutService } from './appLayout.service';
import { CreateAppLayoutDto, UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Controller('app-layout')
export class AppLayoutController {
  constructor(private readonly appLayoutService: AppLayoutService) {}

  @Get('default')
async getDefaultLayout() {
  return await this.appLayoutService.getDefaultLayout();
}


  @Post('create')
  async createLayout(@Body() createAppLayoutDto: CreateAppLayoutDto) {
    return this.appLayoutService.createLayout(createAppLayoutDto);
  }

  @Put('update')
async updateLayout(@Body() updateAppLayoutDto: UpdateAppLayoutDto) {
  try {
    console.log('Received payload:', updateAppLayoutDto);
    return await this.appLayoutService.updateLayout(updateAppLayoutDto);
  } catch (error) {
    console.error('Validation or processing error:', error.message);
    throw error;
  }
}

@Post('reset/:layoutId')
async resetLayoutToDefault(@Param('layoutId') layoutId: string) {
  return await this.appLayoutService.resetLayoutToDefault(layoutId);
}



}
