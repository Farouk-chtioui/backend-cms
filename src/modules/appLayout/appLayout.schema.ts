import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AppLayout extends Document {
  @Prop({ type: String, required: true }) // e.g., 'tabs', 'default'
  layoutType: string;

  @Prop({ type: [{ name: String, iconName: String, visible: Boolean, isHome: Boolean }], default: [] })
  bottomBarTabs: {
    name: string;
    iconName: string;
    visible: boolean;
    isHome: boolean;
  }[];
}

export const AppLayoutSchema = SchemaFactory.createForClass(AppLayout);
