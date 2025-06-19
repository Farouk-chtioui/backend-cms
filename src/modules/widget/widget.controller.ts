// src/widget/widget.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { WidgetService } from './widget.service';

@Controller('widgets')
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  async create(@Body() createWidgetDto: any) {
    return this.widgetService.create(createWidgetDto);
  }
  @Get()
  async findAll() {
    return this.widgetService.findAll();
  }

  @Get('mobile-app/:mobileAppId')
  async findByMobileApp(@Param('mobileAppId') mobileAppId: string) {
    return this.widgetService.findByMobileApp(mobileAppId);
  }

  @Get('by-tag/:tagId')
  async findWidgetsByTag(@Param('tagId') tagId: string) {
    return this.widgetService.findWidgetsByTag(tagId);
  }

  @Get(':id/with-tags')
  async getWidgetWithTags(@Param('id') id: string) {
    return this.widgetService.getWidgetWithTags(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.widgetService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWidgetDto: any) {
    return this.widgetService.update(id, updateWidgetDto);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    console.log(`=== DELETE /widgets/${id} ENDPOINT CALLED ===`);
    console.log(`Request received at: ${new Date().toISOString()}`);
    console.log(`Widget ID to delete: ${id}`);

    try {
      const result = await this.widgetService.delete(id);

      console.log(`=== DELETE ENDPOINT SUCCESS ===`);
      console.log(`Deleted widget:`, {
        id: result._id,
        name: result.name,
        type: result.type,
      });

      const response = {
        success: true,
        message: 'Widget deleted successfully',
        deletedWidget: {
          _id: result._id,
          name: result.name,
          type: result.type,
          category: result.category,
        },
        timestamp: new Date().toISOString(),
      };

      console.log(`Sending response:`, response);
      return response;
    } catch (error) {
      console.error(`=== DELETE ENDPOINT FAILED ===`);
      console.error(`Failed to delete widget with id: ${id}`, error);
      console.error(`Error type:`, error.constructor.name);
      console.error(`Error message:`, error.message);
      throw error;
    }
  }

  // Test endpoint to check if widget exists before deletion
  @Get(':id/exists')
  async checkExists(@Param('id') id: string) {
    try {
      const widget = await this.widgetService.findOne(id);
      return { exists: true, widget: widget };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  @Patch(':id/tags')
  async updateWidgetTags(
    @Param('id') id: string,
    @Body() body: { tagIds: string[] },
  ) {
    return this.widgetService.updateWidgetTags(id, body.tagIds);
  }

  // Debug endpoint to get detailed widget information
  @Get(':id/debug')
  async debugWidget(@Param('id') id: string) {
    console.log(`DEBUG: Getting detailed info for widget ${id}`);
    try {
      const widget = await this.widgetService.findOne(id);

      // Check references in WidgetScreens
      const widgetScreenRefs =
        await this.widgetService.findWidgetScreenReferences(id);

      // Check references in Tags
      const tagRefs = await this.widgetService.findTagReferences(id);

      return {
        widget: widget,
        references: {
          widgetScreens: widgetScreenRefs,
          tags: tagRefs,
        },
      };
    } catch (error) {
      return { error: error.message, stack: error.stack };
    }
  }

  // Force delete endpoint
  @Delete(':id/force')
  async forceDelete(@Param('id') id: string) {
    console.log(`FORCE DELETE /widgets/${id}/force endpoint called`);
    try {
      const result = await this.widgetService.forceDelete(id);
      return result;
    } catch (error) {
      console.error(`Force delete failed for widget ${id}:`, error);
      throw error;
    }
  }

  // Verification endpoint to check if widget was actually deleted
  @Get(':id/verify-deleted')
  async verifyDeleted(@Param('id') id: string) {
    console.log(
      `VERIFY-DELETED: Checking if widget ${id} was actually deleted`,
    );
    try {
      const widget = await this.widgetService.findOne(id);
      console.log(`VERIFY-DELETED: Widget ${id} STILL EXISTS in database!`);
      return {
        deleted: false,
        widget: widget,
        message: 'Widget still exists in database',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.log(
          `VERIFY-DELETED: Widget ${id} successfully deleted (not found)`,
        );
        return {
          deleted: true,
          message: 'Widget successfully deleted from database',
        };
      }
      console.error(`VERIFY-DELETED: Error checking widget ${id}:`, error);
      return {
        deleted: 'unknown',
        error: error.message,
      };
    }
  }

  // Diagnostics endpoint
  @Get('diagnostics/model-health')
  async diagnostics() {
    console.log('DIAGNOSTICS: Running widget model health check');
    try {
      const diagnostics = await this.widgetService.diagnoseWidgetModel();
      return diagnostics;
    } catch (error) {
      console.error('DIAGNOSTICS: Failed to run diagnostics:', error);
      throw error;
    }
  }
}
