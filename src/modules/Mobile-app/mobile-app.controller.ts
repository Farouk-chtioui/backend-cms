import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesign } from '../appDesign/appDesign.schema';

@Controller('mobile-app')
export class MobileAppController {
  constructor(private readonly mobileAppService: MobileAppService) {}

  @Post()
  async create(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.create(createMobileAppDto);
  }

  
 

  @Put(':id/design')
  async updateDesign(
    @Param('id') id: string,
    @Body() designData: Partial<AppDesign>,
  ) {
    return this.mobileAppService.updateDesign(id, designData);
  }
  
 @Put(':repositoryId/design')
  async updateDesignByRepositoryId(
    @Param('repositoryId') repositoryId: string,
    @Body() designData: Partial<AppDesign>,
  ) {
    return this.mobileAppService.updateDesignByRepositoryId(repositoryId, designData);
  }
}
