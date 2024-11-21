import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Logger,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesign } from '../appDesign/appDesign.schema';
import { CreateTabDto } from '../appLayout/dto/createTab.dto';

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

  @Put(':id/design')
  async updateDesign(
    @Param('id') id: string,
    @Body() designData: Partial<AppDesign>,
  ) {
    return this.mobileAppService.updateDesign(id, designData);
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

  @Get(':id/design')
  async getDesign(@Param('id') id: string) {
    return this.mobileAppService.getAppDesign(id);
  }

  @Get(':id/repository')
  async getByRepositoryId(@Param('id') repositoryId: string) {
    return this.mobileAppService.findMobileAppByRepositoryId(repositoryId);
  }
  
  @Post('generate') 
  async generateAppWithTheme(@Body() createMobileAppDto: CreateMobileAppDto) {
    return this.mobileAppService.generateAppWithTheme(createMobileAppDto);
  }
}
