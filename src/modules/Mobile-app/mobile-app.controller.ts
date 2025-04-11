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
  Query,
} from '@nestjs/common';
import { MobileAppService } from './mobile-app.service';
import { CreateMobileAppDto } from './dto/create-mobile-app.dto';
import { AppDesign } from '../appDesign/appDesign.schema';
import { AppLayout } from '../appLayout/appLayout.schema';
import { SendNotificationDto } from './dto/send-notification.dto';

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

  // Updated endpoint: Generate the mobile app with optional ota-only and forceRebuild parameters
  @Post(':id/generate')
  async generateMobileApp(
    @Param('id') mobileAppId: string,
    @Query('otaOnly') otaOnly: string,
    @Query('forceRebuild') forceRebuild: string,
    @Query('forceOtaUpdate') forceOtaUpdate: string,
  ) {
    try {
      // 1) Retrieve all data needed to build the Flutter application
      const fullData =
        await this.mobileAppService.getFullMobileAppData(mobileAppId);

      // Convert query string parameters to boolean
      const updateOnlyOta = otaOnly === 'true';
      const shouldForceRebuild = forceRebuild === 'true';
      // New parameter to force OTA update without rebuild
      const shouldForceOtaUpdate = forceOtaUpdate === 'true';

      this.logger.log(
        `Generating app with otaOnly=${updateOnlyOta}, forceRebuild=${shouldForceRebuild}, forceOtaUpdate=${shouldForceOtaUpdate}`,
      );

      // 2) Call a service method that delegates to AppGenerationService with the options
      const result = await this.mobileAppService.generateMobileApp(
        fullData,
        updateOnlyOta,
        shouldForceRebuild,
        shouldForceOtaUpdate,
      );

      return {
        message:
          updateOnlyOta && !shouldForceRebuild
            ? 'OTA pack update complete'
            : 'App generation complete',
        data: result,
      };
    } catch (error) {
      this.logger.error(`App generation failed: ${error.message}`);
      throw new HttpException(
        `Failed to generate app: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NEW ENDPOINT: Update build result after CI/CD workflow completes (callback from CI/CD)
  @Put(':id/update-build')
  async updateBuildResult(
    @Param('id') mobileAppId: string,
    @Body() body: { apkUrl: string },
  ) {
    try {
      const result = await this.mobileAppService.updateBuildResult(
        mobileAppId,
        body.apkUrl,
      );
      return {
        message: 'Build result updated successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to update build result: ${error.message}`);
      throw new HttpException(
        `Failed to update build result: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NEW ENDPOINT: Retrieve build status including APK URL and QR code
  @Get(':id/build-status')
  async getBuildStatus(@Param('id') mobileAppId: string) {
    try {
      const status = await this.mobileAppService.getBuildStatus(mobileAppId);
      return status;
    } catch (error) {
      this.logger.error(`Failed to get build status: ${error.message}`);
      throw new HttpException(
        `Failed to get build status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/push')
  async sendPush(
    @Param('id') mobileAppId: string,
    @Body() payload: SendNotificationDto,
  ) {
    return this.mobileAppService.sendNotificationToApp(mobileAppId, payload);
  }
}
