import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false }) // Prevents generation of `_id` for each tab
export class BottomBarTab {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  iconName: string;

  @Prop({ default: true })
  visible: boolean;

  @Prop({ default: false })
  isHome: boolean;
}

@Schema()
export class AppLayout extends Document {
  @Prop({ required: true })
  layoutType: string;

  @Prop({ type: [BottomBarTab], _id: false }) // `_id: false` ensures no `_id` is generated for tabs
  bottomBarTabs: BottomBarTab[];
}

export const AppLayoutSchema = SchemaFactory.createForClass(AppLayout);
