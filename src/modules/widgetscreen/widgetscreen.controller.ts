import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { WidgetScreenService } from './widgetscreen.service';

@Controller('widgetscreens')
export class WidgetScreenController {
  constructor(private readonly widgetScreenService: WidgetScreenService) {}

  @Post()
  async create(@Body() createWidgetScreenDto: any) {
    return this.widgetScreenService.create(createWidgetScreenDto);
  }

  @Get()
  async findAll() {
    return this.widgetScreenService.findAll();
  }
  

  @Get('mobile/:mobileAppId')
  async findByMobileApp(@Param('mobileAppId') mobileAppId: string) {
    return this.widgetScreenService.findByMobileApp(mobileAppId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.widgetScreenService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWidgetScreenDto: any) {
    return this.widgetScreenService.update(id, updateWidgetScreenDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.widgetScreenService.delete(id);
  }
}
