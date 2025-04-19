import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    HttpException,
    HttpStatus,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    BadRequestException,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { MapsService } from './maps.service';
  import {
    CreateMapPinDto,
    UpdateMapPinDto,
    CreateMapOverlayDto,
    UpdateMapOverlayDto,
    UpdateEventLocationDto,
  } from './maps.dto';
  import { Express } from 'express';
  
  // Custom file size validator for overlays
  class MapOverlaySizeValidator extends MaxFileSizeValidator {
    constructor() {
      super({ maxSize: 20 * 1024 * 1024 }); // 20MB max size
    }
  }
  
  @Controller('maps')
  export class MapsController {
    constructor(private readonly mapsService: MapsService) {}
  
    // Event Location endpoints
    @Get('app/:appId/location')
    async getEventLocation(@Param('appId') appId: string) {
      try {
        return await this.mapsService.getEventLocation(appId);
      } catch (error) {
        this.handleError(error, 'Failed to get event location');
      }
    }
  
    @Put('app/:appId/location')
    async updateEventLocation(
      @Param('appId') appId: string,
      @Body() updateDto: UpdateEventLocationDto,
    ) {
      try {
        return await this.mapsService.updateEventLocation(appId, updateDto);
      } catch (error) {
        this.handleError(error, 'Failed to update event location');
      }
    }
  
    // Map Pins endpoints
    @Get('app/:appId/pins')
    async getAllPins(@Param('appId') appId: string) {
      try {
        return await this.mapsService.getAllPins(appId);
      } catch (error) {
        this.handleError(error, 'Failed to get map pins');
      }
    }
  
    @Post('app/:appId/pins')
async createPin(
  @Param('appId') appId: string,
  @Body() createDto: CreateMapPinDto,
) {
  try {
    // Console log for debugging
    console.log('Received create pin request for appId:', appId);
    console.log('Pin data:', createDto);
    
    // Make sure appId from URL is used (important!)
    const pinData = {
      ...createDto,
      appId: appId // Explicitly set appId from the URL parameter
    };
    
    return await this.mapsService.createPin(pinData);
  } catch (error) {
    this.handleError(error, 'Failed to create map pin');
  }
}
  
    @Put('app/:appId/pins/:pinId')
    async updatePin(
      @Param('appId') appId: string,
      @Param('pinId') pinId: string,
      @Body() updateDto: UpdateMapPinDto,
    ) {
      try {
        return await this.mapsService.updatePin(appId, pinId, updateDto);
      } catch (error) {
        this.handleError(error, 'Failed to update map pin');
      }
    }
  
    @Delete('app/:appId/pins/:pinId')
    async deletePin(
      @Param('appId') appId: string,
      @Param('pinId') pinId: string,
    ) {
      try {
        return await this.mapsService.deletePin(appId, pinId);
      } catch (error) {
        this.handleError(error, 'Failed to delete map pin');
      }
    }
  
    // Map Overlays endpoints
    @Get('app/:appId/overlays')
    async getAllOverlays(@Param('appId') appId: string) {
      try {
        return await this.mapsService.getAllOverlays(appId);
      } catch (error) {
        this.handleError(error, 'Failed to get map overlays');
      }
    }
  
    @Post('app/:appId/overlays')
    @UseInterceptors(FileInterceptor('file'))
    async createOverlay(
      @Param('appId') appId: string,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
            new MapOverlaySizeValidator(),
          ],
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      )
      file: Express.Multer.File,
      @Body() createDto: CreateMapOverlayDto,
    ) {
      try {
        console.log('Received overlay file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: Math.round(file.size / 1024 / 1024) + 'MB',
        });
  
        createDto.appId = appId; // Ensure appId matches the URL param
        return await this.mapsService.createOverlay(file, createDto);
      } catch (error) {
        this.handleError(error, 'Failed to create map overlay');
      }
    }
  
    @Put('app/:appId/overlays/:overlayId')
    async updateOverlay(
      @Param('appId') appId: string,
      @Param('overlayId') overlayId: string,
      @Body() updateDto: UpdateMapOverlayDto,
    ) {
      try {
        return await this.mapsService.updateOverlay(appId, overlayId, updateDto);
      } catch (error) {
        this.handleError(error, 'Failed to update map overlay');
      }
    }
  
    @Put('app/:appId/overlays/:overlayId/file')
    @UseInterceptors(FileInterceptor('file'))
    async updateOverlayWithFile(
      @Param('appId') appId: string,
      @Param('overlayId') overlayId: string,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
            new MapOverlaySizeValidator(),
          ],
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      )
      file: Express.Multer.File,
      @Body() updateDto: UpdateMapOverlayDto,
    ) {
      try {
        console.log('Received overlay update file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: Math.round(file.size / 1024 / 1024) + 'MB',
        });
        
        return await this.mapsService.updateOverlayWithFile(appId, overlayId, file, updateDto);
      } catch (error) {
        this.handleError(error, 'Failed to update map overlay with file');
      }
    }
  
    @Delete('app/:appId/overlays/:overlayId')
    async deleteOverlay(
      @Param('appId') appId: string,
      @Param('overlayId') overlayId: string,
    ) {
      try {
        return await this.mapsService.deleteOverlay(appId, overlayId);
      } catch (error) {
        this.handleError(error, 'Failed to delete map overlay');
      }
    }
  
    // Error handling helper
    private handleError(error: any, defaultMessage: string) {
      console.error(error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      const message = error.message || defaultMessage;
      const status = 
        error instanceof BadRequestException ? HttpStatus.BAD_REQUEST : 
        error.name === 'NotFoundException' ? HttpStatus.NOT_FOUND :
        HttpStatus.INTERNAL_SERVER_ERROR;
      
      throw new HttpException(
        {
          status,
          error: defaultMessage,
          message,
        },
        status,
      );
    }
    }