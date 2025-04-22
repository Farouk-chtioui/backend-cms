import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpStatus,
  HttpCode,
  Query
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto, LinkEntityToTagDto } from './dtos/tag.dto';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagService.create(createTagDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.tagService.findAll();
  }

  @Get('app/:appId')
  @HttpCode(HttpStatus.OK)
  async findByAppId(@Param('appId') appId: string) {
    return this.tagService.findByAppId(appId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.tagService.findById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string, 
    @Body() updateTagDto: UpdateTagDto
  ) {
    return this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.tagService.delete(id);
  }

  // Routes for managing relationships

  @Post(':id/widgets')
  @HttpCode(HttpStatus.OK)
  async linkToWidgets(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.linkToWidgets(id, linkDto.entityIds);
  }

  @Delete(':id/widgets')
  @HttpCode(HttpStatus.OK)
  async unlinkFromWidgets(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.unlinkFromWidgets(id, linkDto.entityIds);
  }

  @Post(':id/widgetscreens')
  @HttpCode(HttpStatus.OK)
  async linkToWidgetScreens(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.linkToWidgetScreens(id, linkDto.entityIds);
  }

  @Delete(':id/widgetscreens')
  @HttpCode(HttpStatus.OK)
  async unlinkFromWidgetScreens(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.unlinkFromWidgetScreens(id, linkDto.entityIds);
  }

  @Post(':id/screens')
  @HttpCode(HttpStatus.OK)
  async linkToScreens(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.linkToScreens(id, linkDto.entityIds);
  }

  @Delete(':id/screens')
  @HttpCode(HttpStatus.OK)
  async unlinkFromScreens(
    @Param('id') id: string,
    @Body() linkDto: LinkEntityToTagDto
  ) {
    return this.tagService.unlinkFromScreens(id, linkDto.entityIds);
  }

  // Routes for retrieval by entity
  
  @Get('widget/:widgetId')
  @HttpCode(HttpStatus.OK)
  async findTagsByWidgetId(@Param('widgetId') widgetId: string) {
    return this.tagService.findTagsByWidgetId(widgetId);
  }

  @Get('widgetscreen/:screenId')
  @HttpCode(HttpStatus.OK)
  async findTagsByWidgetScreenId(@Param('screenId') screenId: string) {
    return this.tagService.findTagsByWidgetScreenId(screenId);
  }

  @Get('screen/:screenId')
  @HttpCode(HttpStatus.OK)
  async findTagsByScreenId(@Param('screenId') screenId: string) {
    return this.tagService.findTagsByScreenId(screenId);
  }
}
