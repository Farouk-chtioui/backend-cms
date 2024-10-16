import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';

@Controller('mobile-app')
export class MobileAppController {
  constructor(private readonly mobileAppService: MobileAppService) {}

  @Post()
  async create(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.create(createMobileAppDto);
  }

  @Get()
  async findAll() {
    return this.mobileAppService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.mobileAppService.findById(id);
  }
}
