// src/widget/widget-type.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { WidgetTypeService } from './widget-type.service';

@Controller('widget-types')
export class WidgetTypeController {
  constructor(private readonly widgetTypeService: WidgetTypeService) {}

  @Post()
  async create(@Body() createWidgetTypeDto: any) {
    return this.widgetTypeService.create(createWidgetTypeDto);
  }

  @Get()
  async findAll() {
    return this.widgetTypeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.widgetTypeService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWidgetTypeDto: any) {
    return this.widgetTypeService.update(id, updateWidgetTypeDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.widgetTypeService.delete(id);
  }
}
