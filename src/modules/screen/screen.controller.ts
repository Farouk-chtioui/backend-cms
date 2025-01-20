import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus } from '@nestjs/common';
import { ScreenService } from './screen.service';
import { CreateScreenDto, UpdateScreenDto } from './dtos/screen.dto';

@Controller('screens')
export class ScreenController {
  constructor(private readonly screenService: ScreenService) {}

  @Post()
  async create(@Body() createScreenDto: CreateScreenDto) {
    return this.screenService.create(createScreenDto);
  }

  @Get()
  async findAll() {
    return this.screenService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.screenService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateScreenDto: UpdateScreenDto) {
    return this.screenService.update(id, updateScreenDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.screenService.delete(id);
  }
}
