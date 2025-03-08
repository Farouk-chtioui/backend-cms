// src/generate/generate.controller.ts
import { Controller, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { GenerateService } from './generate.service';

@Controller('generate')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  /**
   * POST /generate/ota/:appId
   * Generates a new OTA package for the given appId and returns the file path.
   */
  @Post('ota/:appId')
  async createOtaForApp(@Param('appId') appId: string): Promise<{ otaPath: string }> {
    if (!appId) throw new BadRequestException('Missing appId');
    const otaPath = await this.generateService.generateOtaPackage(appId);
    return { otaPath };
  }

  /**
   * POST /generate/inject-ota
   * Body: { appId: string; otaPackagePath: string }
   * Injects an existing OTA zip into a flutter template for the given appId.
   */
  @Post('inject-ota')
  async injectOtaIntoTemplate(
    @Body() data: { appId: string; otaPackagePath: string },
  ): Promise<{ finalAppPath: string }> {
    if (!data.appId || !data.otaPackagePath) {
      throw new BadRequestException('Missing appId or otaPackagePath');
    }
    const finalAppPath = await this.generateService.injectOtaIntoFlutterTemplate(
      data.appId,
      data.otaPackagePath,
    );
    return { finalAppPath };
  }
}
