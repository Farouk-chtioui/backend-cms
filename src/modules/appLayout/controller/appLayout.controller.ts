import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AppLayoutService } from '../service/appLayout.service';
import { CreateTabDto } from '../dto/createTab.dto';
@Controller('app-layout')
export class AppLayoutController {
  constructor(private readonly appLayoutService: AppLayoutService) {}

  @Get('tabs')
  findAll() {
    return this.appLayoutService.findAll();
  }

  @Post('tabs')
  create(@Body() createTabDto: CreateTabDto) {
    return this.appLayoutService.create(createTabDto);
  }

  @Put('tabs/:id')
  update(@Param('id') id: number, @Body() updateTabDto: CreateTabDto) {
    return this.appLayoutService.update(id, updateTabDto);
  }

  @Delete('tabs/:id')
  delete(@Param('id') id: number) {
    return this.appLayoutService.delete(id);
  }
}
