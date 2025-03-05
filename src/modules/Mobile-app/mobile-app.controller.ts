import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';

@Controller('mobile-app')
export class MobileAppController {
  private readonly logger = new Logger(MobileAppController.name);

  constructor(private readonly mobileAppService: MobileAppService) {}

  @Post()
  async create(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.create(createMobileAppDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mobileAppService.findOne(id);
  }

  // App Design Routes
  @Get(':id/design/default')
  async getDefaultAppDesign(@Param('id') appId: string) {
    return await this.mobileAppService.getDefaultAppDesign(appId);
  }

  @Put(':id/design')
  async updateAppDesign(
    @Param('id') appId: string,
    @Body() designData: Partial<AppDesign>,
  ) {
    return await this.mobileAppService.updateAppDesign(appId, designData);
  }

  @Post(':id/design/reset')
  async resetAppDesign(@Param('id') appId: string) {
    return await this.mobileAppService.resetAppDesign(appId);
  }

  // App Layout Routes
  @Put(':id/layout')
  async updateAppLayout(
    @Param('id') id: string,
    @Body() layoutData: Partial<AppLayout>,
  ) {
    return await this.mobileAppService.updateAppLayout(id, layoutData);
  }

  @Get(':id/layout')
  async getAppLayout(@Param('id') id: string) {
    return await this.mobileAppService.getAppLayout(id);
  }

  @Post(':id/layout/reset')
  async resetAppLayout(@Param('id') appId: string) {
    return await this.mobileAppService.resetAppLayout(appId);
  }

  @Put(':id/repository')
  async updateDesignByRepositoryId(
    @Param('id') repositoryId: string,
    @Body() designData: Partial<AppDesign>,
  ) {
    return this.mobileAppService.updateDesignByRepositoryId(
      repositoryId,
      designData,
    );
  }

  @Get(':id/repository')
  async getByRepositoryId(@Param('id') repositoryId: string) {
    return this.mobileAppService.findMobileAppByRepositoryId(repositoryId);
  }

 

  @Get(':appId/config')
  async getAppConfig(@Param('appId') appId: string) {
    return await this.mobileAppService.getAppConfiguration(appId);
  }

  @Get(':mobileId/full')
  async getFullMobileAppData(@Param('mobileId') mobileId: string) {
    return this.mobileAppService.getFullMobileAppData(mobileId);
  }
}
