import { Controller, Get, Post, Put, Patch, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { WidgetScreenService } from './widgetscreen.service';
import { HeaderConfig } from '../header/header.interface';

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

  // Header-specific endpoints
  @Get(':id/header')
  async getHeader(@Param('id') id: string) {
    const screen = await this.widgetScreenService.findOne(id);
    return screen.header;
  }

  @Patch(':id/header')
  async updateHeader(
    @Param('id') id: string, 
    @Body() headerData: { header: HeaderConfig | null }
  ) {
    return this.widgetScreenService.updateHeader(id, headerData.header);
  }

  @Delete(':id/header')
  async deleteHeader(@Param('id') id: string) {
    return this.widgetScreenService.deleteHeader(id);
  }

  // Tag-related endpoints
  @Patch(':id/tags')
  async updateWidgetScreenTags(
    @Param('id') id: string,
    @Body() body: { tagIds: string[] }
  ) {
    return this.widgetScreenService.updateWidgetScreenTags(id, body.tagIds);
  }
  
  @Get(':id/with-tags')
  async getWidgetScreenWithTags(@Param('id') id: string) {
    return this.widgetScreenService.getWidgetScreenWithTags(id);
  }
  
  @Get('by-tag/:tagId')
  async findWidgetScreensByTag(@Param('tagId') tagId: string) {
    return this.widgetScreenService.findWidgetScreensByTag(tagId);
  }
}