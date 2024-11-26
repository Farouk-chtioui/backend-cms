import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AppLayout extends Document {
  @Prop({ required: true })
  layoutType: string;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        iconName: { type: String, required: true },
        visible: { type: Boolean, default: true },
        isHome: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  bottomBarTabs: Array<{
    name: string;
    iconName: string;
    visible: boolean;
    isHome: boolean;
  }>;
}

export const AppLayoutSchema = SchemaFactory.createForClass(AppLayout);
