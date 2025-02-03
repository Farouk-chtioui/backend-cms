import {
    Controller,
    Get,
    Post,
    Param,
    Delete,
    UseInterceptors,
    UploadedFile,
    Body,
    HttpException,
    HttpStatus,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ImagesService } from './images.service';
  import { CreateImageDto } from './create-image.dto';
  import { Express } from 'express';
  
  // Custom file size validator class
  class CustomFileSizeValidator extends MaxFileSizeValidator {
    constructor() {
      super({ maxSize: 30 * 1024 * 1024 }); // Set to max possible size (30MB)
    }
  
    validate(file: Express.Multer.File): boolean {
      if (file.mimetype === 'image/gif') {
        const maxGifSize = 30 * 1024 * 1024; // 30MB for GIFs
        if (file.size > maxGifSize) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: 'Validation failed',
              message: 'GIF size must be less than 30MB',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        const maxSize = 20 * 1024 * 1024; // 20MB for other images
        if (file.size > maxSize) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: 'Validation failed',
              message: 'Image size must be less than 20MB',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return true;
    }
  }
  
  @Controller('images')
  export class ImagesController {
    constructor(private readonly imagesService: ImagesService) {}
  
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async create(
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
            new CustomFileSizeValidator(),
          ],
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          exceptionFactory: (error: string | Error) => {
            const message = error instanceof Error ? error.message : error;
            return new HttpException(
              {
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                error: 'Validation failed',
                message: message,
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          },
        }),
      )
      file: Express.Multer.File,
      @Body() createImageDto: CreateImageDto,
    ) {
      try {
        console.log('Received file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: Math.round(file.size / 1024 / 1024) + 'MB',
        });
        
        return await this.imagesService.uploadImage(file, createImageDto);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Upload failed',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get('app/:appId')
    async findAll(@Param('appId') appId: string) {
      try {
        return await this.imagesService.findAll(appId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch images';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to fetch images',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      try {
        const image = await this.imagesService.findOne(id);
        if (!image) {
          throw new HttpException(
            {
              status: HttpStatus.NOT_FOUND,
              error: 'Image not found',
              message: 'The requested image was not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }
        return image;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch image';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to fetch image',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string) {
      try {
        const result = await this.imagesService.remove(id);
        if (!result) {
          throw new HttpException(
            {
              status: HttpStatus.NOT_FOUND,
              error: 'Image not found',
              message: 'The image to delete was not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }
        return { message: 'Image deleted successfully' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete image';
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Failed to delete image',
            message: message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }