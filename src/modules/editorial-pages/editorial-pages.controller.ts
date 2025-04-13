import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    HttpException,
    HttpStatus,
    BadRequestException,
  } from '@nestjs/common';
  import { EditorialPagesService } from './editorial-pages.service';
  import { CreateEditorialPageDto } from './create-editorial-page.dto';
  import { UpdateEditorialPageDto } from './update-editorial-page.dto';
  
  @Controller('editorial-pages')
  export class EditorialPagesController {
    constructor(private readonly editorialPagesService: EditorialPagesService) {}
  
    @Post()
    async create(@Body() createEditorialPageDto: CreateEditorialPageDto) {
      try {
        console.log('Creating editorial page:', {
          name: createEditorialPageDto.name,
          description: createEditorialPageDto.description,
          appId: createEditorialPageDto.appId,
        });
        
        return await this.editorialPagesService.create(createEditorialPageDto);
      } catch (error) {
        console.error('Create error:', error);
        const message = error instanceof Error ? error.message : 'Creation failed';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Creation failed',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get('app/:appId')
    async findAll(@Param('appId') appId: string) {
      try {
        console.log('Fetching editorial pages for app ID:', appId);
        return await this.editorialPagesService.findAll(appId);
      } catch (error) {
        console.error('Find all error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch editorial pages';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to fetch editorial pages',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      try {
        console.log('Fetching editorial page with ID:', id);
        const page = await this.editorialPagesService.findOne(id);
        if (!page) {
          throw new HttpException(
            {
              status: HttpStatus.NOT_FOUND,
              error: 'Editorial page not found',
              message: 'The requested editorial page was not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }
        return page;
      } catch (error) {
        console.error('Find one error:', error);
        if (error instanceof HttpException) {
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Failed to fetch editorial page';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to fetch editorial page',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Put(':id')
    async update(@Param('id') id: string, @Body() updateEditorialPageDto: UpdateEditorialPageDto) {
      try {
        console.log('Updating editorial page with ID:', id);
        return await this.editorialPagesService.update(id, updateEditorialPageDto);
      } catch (error) {
        console.error('Update error:', error);
        const message = error instanceof Error ? error.message : 'Failed to update editorial page';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to update editorial page',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string) {
      if (!id) {
        console.error('Delete request received with missing ID');
        throw new BadRequestException('Editorial page ID is required');
      }
  
      try {
        console.log(`Delete request received for editorial page ID: ${id}`);
        const result = await this.editorialPagesService.remove(id);
        return { success: result, message: 'Editorial page deleted successfully' };
      } catch (error) {
        console.error('Delete error:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete editorial page';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to delete editorial page',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }