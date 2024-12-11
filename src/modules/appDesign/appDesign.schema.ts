// src/app-design/app-design.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AppDesign extends Document {
  // Theme Colors
  @Prop({
    type: Object,
    default: {
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
  })
  themeColors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };

  // Status Bar Theme (enum-like constraint)
  @Prop({
    type: String,
    enum: ['light', 'dark'],
    default: 'light',
  })
  statusBarTheme: string;
}

export const AppDesignSchema = SchemaFactory.createForClass(AppDesign);
