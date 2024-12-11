// src/app-design/app-design.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppDesign } from './appDesign.schema';

@Injectable()
export class AppDesignService {
  constructor(@InjectModel(AppDesign.name) private appDesignModel: Model<AppDesign>) {}

  async createAppDesign(): Promise<AppDesign> {
    const newDesign = new this.appDesignModel();
    return newDesign.save();
  }

  async getDefaultAppDesign(): Promise<AppDesign> {
    let defaultDesign = await this.appDesignModel.findOne({ isDefault: true });
    if (!defaultDesign) {
      defaultDesign = new this.appDesignModel({
        isDefault: true,
        themeColors: {
          light: {
            mainAppBackground: "#FFFFFF",
            secondaryBackground: "#F7F7F7",
            mainText: "#000000",
            titleText: "#333333",
            importantText: "#2E9C00",
            accent: "#0072F5",
            secondaryAccent: "#7A7AFF",
            bottomBarBackground: "#F9F9F9",
            bottomBarSelectedIcon: "#F1C40F",
            bottomBarUnselectedIcon: "#BDC3C7",
            topBarBackground: "#FF9292",
            topBarTextAndIcon: "#FFFFFF",
          },
          dark: {
            mainAppBackground: "#121212",
            secondaryBackground: "#1E1E1E",
            mainText: "#E0E0E0",
            titleText: "#AAAAAA",
            importantText: "#00BC78",
            accent: "#17C964",
            secondaryAccent: "#5E35B1",
            bottomBarBackground: "#000000",
            bottomBarSelectedIcon: "#F39C12",
            bottomBarUnselectedIcon: "#7F8C8D",
            topBarBackground: "#2E4053",
            topBarTextAndIcon: "#ECF0F1",
          },
        },
        statusBarTheme: "light",
      });
      await defaultDesign.save();
    }
    return defaultDesign;
  }

  async resetAppDesign(designId: string): Promise<AppDesign> {
    const design = await this.appDesignModel.findById(designId);
    if (!design) {
      throw new NotFoundException(`AppDesign with ID ${designId} not found`);
    }

    design.themeColors = {
      light: {
        mainAppBackground: "#FFFFFF",
        secondaryBackground: "#F7F7F7",
        mainText: "#000000",
        titleText: "#333333",
        importantText: "#2E9C00",
        accent: "#0072F5",
        secondaryAccent: "#7A7AFF",
        bottomBarBackground: "#F9F9F9",
        bottomBarSelectedIcon: "#F1C40F",
        bottomBarUnselectedIcon: "#BDC3C7",
        topBarBackground: "#FF9292",
        topBarTextAndIcon: "#FFFFFF",
      },
      dark: {
        mainAppBackground: "#121212",
        secondaryBackground: "#1E1E1E",
        mainText: "#E0E0E0",
        titleText: "#AAAAAA",
        importantText: "#00BC78",
        accent: "#17C964",
        secondaryAccent: "#5E35B1",
        bottomBarBackground: "#000000",
        bottomBarSelectedIcon: "#F39C12",
        bottomBarUnselectedIcon: "#7F8C8D",
        topBarBackground: "#2E4053",
        topBarTextAndIcon: "#ECF0F1",
      },
    };
    design.statusBarTheme = "light";
    await design.save();
    return design;
  }

  async updateAppDesign(designId: string, designData: Partial<AppDesign>): Promise<AppDesign> {
    return this.appDesignModel.findByIdAndUpdate(designId, designData, { new: true }).exec();
  }
}
