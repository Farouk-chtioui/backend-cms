import { Controller, Get, Patch, Delete, Param, Body, NotFoundException, ValidationPipe } from '@nestjs/common';
import { HeaderService } from './header.service';
import { UpdateHeaderDto } from './header.dto';

@Controller('headers')
export class HeaderController {
  constructor(private readonly headerService: HeaderService) {}

  /**
   * Get header by screen ID
   */
  @Get('screen/:screenId')
  async getHeaderByScreenId(@Param('screenId') screenId: string) {
    const header = await this.headerService.getHeaderByScreenId(screenId);
    if (!header) {
      return null; // It's okay to return null for non-existent headers
    }
    return header;
  }

  /**
   * Update header for a screen
   */
  @Patch('screen/:screenId')
  async updateHeaderForScreen(
    @Param('screenId') screenId: string,
    @Body(new ValidationPipe({ transform: true })) updateHeaderDto: UpdateHeaderDto,
  ) {
    try {
      return await this.headerService.updateHeaderForScreen(screenId, updateHeaderDto.header);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update header: ${error.message}`);
    }
  }

  /**
   * Delete header from a screen
   */
  @Delete('screen/:screenId')
  async deleteHeaderFromScreen(@Param('screenId') screenId: string) {
    try {
      return await this.headerService.deleteHeaderFromScreen(screenId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete header: ${error.message}`);
    }
  }
}