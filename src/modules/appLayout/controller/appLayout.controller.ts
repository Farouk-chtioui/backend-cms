import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AppLayoutService } from '../service/appLayout.service';
import { CreateTabDto } from '../dto/createTab.dto';

@Controller('app-layout')
export class AppLayoutController {
  constructor(private readonly appLayoutService: AppLayoutService) {}

  @Get('tabs')
  async findAll() {
    return this.appLayoutService.findAll();
  }

  @Post('tabs')
  async create(@Body() createTabDto: CreateTabDto) {
    return this.appLayoutService.create(createTabDto);
  }

  @Put('tabs/:id')
  async update(@Param('id') id: string, @Body() updateTabDto: CreateTabDto) {
    return this.appLayoutService.update(id, updateTabDto);
  }

  @Delete('tabs/:id')
  async delete(@Param('id') id: string) {
    return this.appLayoutService.delete(id);
  }
}