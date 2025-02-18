import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpStatus,
    HttpException,
    UseGuards,
    ValidationPipe,
  } from '@nestjs/common';
  import { WidgetScreensService } from './widget-screen.service';
  import { CreateWidgetScreenDto } from './create-widget-screen.dto';
  import { UpdateWidgetScreenDto } from './update-widget-screen.dto';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
  import { Types } from 'mongoose';
  
  @ApiTags('widget-screens')
  @Controller('widget-screens')
  export class WidgetScreensController {
    constructor(private readonly widgetScreensService: WidgetScreensService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new widget screen' })
    @ApiResponse({ 
      status: 201, 
      description: 'The widget screen has been successfully created.' 
    })
    @ApiResponse({ 
      status: 400, 
      description: 'Invalid input data.' 
    })
    async create(@Body(new ValidationPipe()) createWidgetScreenDto: CreateWidgetScreenDto) {
      try {
        return await this.widgetScreensService.create(createWidgetScreenDto);
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to create widget screen',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all widget screens' })
    @ApiQuery({ name: 'appId', required: false, description: 'Optional app ID to filter screens' })
    @ApiResponse({ 
      status: 200, 
      description: 'Returns all widget screens' 
    })
    async findAll(@Query('appId') appId?: string) {
      try {
        if (appId) {
          return await this.widgetScreensService.findAllByAppId(appId);
        }
        return await this.widgetScreensService.findAll();
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to fetch widget screens',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a widget screen by ID' })
    @ApiParam({ name: 'id', description: 'Widget screen ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'Returns the found widget screen' 
    })
    @ApiResponse({ 
      status: 404, 
      description: 'Widget screen not found' 
    })
    async findOne(@Param('id') id: string) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget screen ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        return await this.widgetScreensService.findOne(id);
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to fetch widget screen',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a widget screen' })
    @ApiParam({ name: 'id', description: 'Widget screen ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'The widget screen has been successfully updated.' 
    })
    async update(
      @Param('id') id: string,
      @Body(new ValidationPipe()) updateWidgetScreenDto: UpdateWidgetScreenDto,
    ) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget screen ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        return await this.widgetScreensService.update(id, updateWidgetScreenDto);
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to update widget screen',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a widget screen' })
    @ApiParam({ name: 'id', description: 'Widget screen ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'The widget screen has been successfully deleted.' 
    })
    async remove(@Param('id') id: string) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget screen ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        await this.widgetScreensService.remove(id);
        return {
          statusCode: HttpStatus.OK,
          message: 'Widget screen deleted successfully',
        };
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to delete widget screen',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post(':id/reorder')
    @ApiOperation({ summary: 'Reorder widgets in a screen' })
    @ApiParam({ name: 'id', description: 'Widget screen ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'Widgets have been successfully reordered.' 
    })
    async reorderWidgets(
      @Param('id') id: string,
      @Body() widgetIds: string[],
    ) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget screen ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        await this.widgetScreensService.reorderWidgets(id, widgetIds);
        return {
          statusCode: HttpStatus.OK,
          message: 'Widgets reordered successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to reorder widgets',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }