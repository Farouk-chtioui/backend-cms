import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    Put,
  } from '@nestjs/common';
  import { OnboardingScreensService } from '../service/onboarding-screens.service';
  import { CreateOnboardingScreenDto } from '../dto/create-onboarding-screen.dto';
  import { UpdateOnboardingScreenDto } from '../dto/update-onboarding-screen.dto';
  import { ReorderScreensDto } from '../dto/reorder-screens.dto';
  import { OnboardingScreenCategory, OnboardingScreenType } from '../../../types/onboarding-screen.types';
  
  @Controller('onboarding-screens')
  export class OnboardingScreensController {
    constructor(private readonly onboardingScreensService: OnboardingScreensService) {}
  
    @Post()
    async create(@Body() createOnboardingScreenDto: CreateOnboardingScreenDto) {
      return this.onboardingScreensService.create(createOnboardingScreenDto);
    }
  
    @Get('app/:appId')
    async findAllByAppId(
      @Param('appId') appId: string,
      @Query('category') category?: OnboardingScreenCategory,
      @Query('screenType') screenType?: OnboardingScreenType,
    ) {
      return this.onboardingScreensService.findAllByAppId(appId, category, screenType);
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.onboardingScreensService.findOne(id);
    }
  
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateOnboardingScreenDto: UpdateOnboardingScreenDto) {
      return this.onboardingScreensService.update(id, updateOnboardingScreenDto);
    }
  
    @Delete(':id') 
    async remove(@Param('id') id: string) {
      return this.onboardingScreensService.remove(id);
    }
  
    @Put('app/:appId/reorder')  
    async reorder(@Param('appId') appId: string, @Body() reorderScreensDto: ReorderScreensDto) {
      return this.onboardingScreensService.reorder(appId, reorderScreensDto);
    }
  
    @Post('app/:appId/create-defaults')
    async createDefaultScreens(
      @Param('appId') appId: string,
      @Query('category') category?: OnboardingScreenCategory,
      @Query('screenType') screenType?: OnboardingScreenType,
    ) {
      return this.onboardingScreensService.ensureDefaultScreenExists(appId, category, screenType);
    }
  }
  