// src/widget/widget.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Patch } from '@nestjs/common';
import { WidgetService } from './widget.service';

@Controller('widgets')
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  async create(@Body() createWidgetDto: any) {
    return this.widgetService.create(createWidgetDto);
  }

  @Get()
  async findAll() {
    return this.widgetService.findAll();
  }

  @Get(':mobileAppId')
  async findByMobileApp(@Param('mobileAppId') mobileAppId: string) {
    return this.widgetService.findByMobileApp(mobileAppId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.widgetService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWidgetDto: any) {
    return this.widgetService.update(id, updateWidgetDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.widgetService.delete(id);
  }

  @Patch(':id/tags')
  async updateWidgetTags(
    @Param('id') id: string,
    @Body() body: { tagIds: string[] }
  ) {
    return this.widgetService.updateWidgetTags(id, body.tagIds);
  }

  @Get(':id/with-tags')
  async getWidgetWithTags(@Param('id') id: string) {
    return this.widgetService.getWidgetWithTags(id);
  }

  @Get('by-tag/:tagId')
  async findWidgetsByTag(@Param('tagId') tagId: string) {
    return this.widgetService.findWidgetsByTag(tagId);
  }
}
