// src/widget/widget.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
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
}
