import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { AppLayoutService } from './appLayout.service';
import { UpdateAppLayoutDto } from './dtos/appLayout.dto';

@Controller('app-layout')
export class AppLayoutController {
  constructor(private readonly appLayoutService: AppLayoutService) {}

  @Get('default')
  async getDefaultLayout() {
    return await this.appLayoutService.getDefaultLayout();
  }

  @Get(':layoutId')
  async getLayoutById(@Param('layoutId') layoutId: string) {
    return await this.appLayoutService.findById(layoutId);
  }

  @Put('update/:layoutId')
  async updateLayout(
    @Param('layoutId') layoutId: string,
    @Body() updateAppLayoutDto: UpdateAppLayoutDto,
  ) {
    return await this.appLayoutService.updateLayoutById(layoutId, updateAppLayoutDto);
  }

  @Post('reset/:layoutId')
  async resetLayoutToDefault(@Param('layoutId') layoutId: string) {
    return await this.appLayoutService.resetLayoutToDefault(layoutId);
  }

  
}
