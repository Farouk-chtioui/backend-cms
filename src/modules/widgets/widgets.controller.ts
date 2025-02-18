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
    ValidationPipe,
  } from '@nestjs/common';
  import { WidgetsService } from './widgets.service';
  import { CreateWidgetDto } from './create-widget.dto';
  import { UpdateWidgetDto } from './update-widget.dto';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
  import { Types } from 'mongoose';
  
  @ApiTags('widgets')
  @Controller('widgets')
  export class WidgetsController {
    constructor(private readonly widgetsService: WidgetsService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new widget' })
    @ApiResponse({ 
      status: 201, 
      description: 'The widget has been successfully created.' 
    })
    async create(@Body(new ValidationPipe()) createWidgetDto: CreateWidgetDto) {
      try {
        return await this.widgetsService.create(createWidgetDto);
      } catch (error) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to create widget',
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all widgets' })
    @ApiQuery({ 
      name: 'screenId', 
      required: false, 
      description: 'Optional screen ID to filter widgets' 
    })
    @ApiResponse({ 
      status: 200, 
      description: 'Returns all widgets' 
    })
    async findAll(@Query('screenId') screenId?: string) {
      try {
        if (screenId) {
          if (!Types.ObjectId.isValid(screenId)) {
            throw new HttpException(
              'Invalid screen ID format',
              HttpStatus.BAD_REQUEST,
            );
          }
          return await this.widgetsService.findAllByScreenId(screenId);
        }
        return await this.widgetsService.findAll();
      } catch (error) {
        if (error.status) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to fetch widgets',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a widget by ID' })
    @ApiParam({ name: 'id', description: 'Widget ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'Returns the found widget' 
    })
    async findOne(@Param('id') id: string) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        return await this.widgetsService.findOne(id);
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to fetch widget',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a widget' })
    @ApiParam({ name: 'id', description: 'Widget ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'The widget has been successfully updated.' 
    })
    async update(
      @Param('id') id: string,
      @Body(new ValidationPipe()) updateWidgetDto: UpdateWidgetDto,
    ) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        return await this.widgetsService.update(id, updateWidgetDto);
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to update widget',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a widget' })
    @ApiParam({ name: 'id', description: 'Widget ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'The widget has been successfully deleted.' 
    })
    async remove(@Param('id') id: string) {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException(
          'Invalid widget ID format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        await this.widgetsService.remove(id);
        return {
          statusCode: HttpStatus.OK,
          message: 'Widget deleted successfully',
        };
      } catch (error) {
        if (error.status === 404) {
          throw error;
        }
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Failed to delete widget',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
  }