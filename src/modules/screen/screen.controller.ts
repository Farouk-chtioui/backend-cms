import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpStatus,
  HttpCode,
  BadRequestException 
} from '@nestjs/common';
import { ScreenService } from './screen.service';
import { CreateScreenDto, UpdateScreenDto, UpdateScreenOrderDto } from './dtos/screen.dto';
import { ScreenType } from './types/screen.types';
import { ScreenWidget } from './types/screen-widget.types';

@Controller('screens')
export class ScreenController {
  constructor(private readonly screenService: ScreenService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createScreenDto: CreateScreenDto) {
    return this.screenService.create(createScreenDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.screenService.findAll();
  }

  @Get('app/:appId')
  @HttpCode(HttpStatus.OK)
  async findByAppId(@Param('appId') appId: string) {
    return this.screenService.findByAppId(appId);
  }

  @Get('app/:appId/type/:screenType')
  @HttpCode(HttpStatus.OK)
  async findByType(
    @Param('appId') appId: string,
    @Param('screenType') screenType: ScreenType
  ) {
    return this.screenService.findByType(appId, screenType);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.screenService.findById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string, 
    @Body() updateScreenDto: UpdateScreenDto
  ) {
    return this.screenService.update(id, updateScreenDto);
  }

  @Patch(':id/order')
  @HttpCode(HttpStatus.OK)
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateScreenOrderDto
  ) {
    return this.screenService.updateOrder(id, updateOrderDto.order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.screenService.delete(id);
  }

  @Post('app/:appId/create-defaults')
  @HttpCode(HttpStatus.CREATED)
  async createDefaultScreens(@Param('appId') appId: string) {
    return this.screenService.createDefaultScreens(appId);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateScreen(
    @Param('id') id: string,
    @Query('newRoute') newRoute: string
  ) {
    if (!newRoute) {
      throw new BadRequestException('newRoute query parameter is required');
    }
    return this.screenService.duplicateScreen(id, newRoute);
  }
}