// repository.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class MobileApp extends Document {
  @Prop({ required: true })
  name: string;

  // App Background
  @Prop({ default: '#FFFFFF' })
  backgroundColor: string;

  @Prop({ default: '#000000' })
  secondaryBackgroundColor: string;

  // Text Colors
  @Prop({ default: '#FFFFFF' })
  mainTextColor: string;

  @Prop({ default: '#000000' })
  titleTextColor: string;

  @Prop({ default: '#00BC7B' })
  importantInformationTextColor: string;

  // Accent Colors
  @Prop({ default: '#7A7AFF' })
  accentColor: string;

  @Prop({ default: '#B400F6' })
  secondaryAccentColor: string;

  // Bottom Bar
  @Prop({ default: '#000000' })
  bottomBarBackgroundColor: string;

  @Prop({ default: '#F9FFC3' })
  bottomBarSelectedIconColor: string;

  @Prop({ default: '#FFFFFF' })
  bottomBarUnselectedIconColor: string;

  // Top Bar
  @Prop({ default: '#FF2929' })
  topBarBackgroundColor: string;

  @Prop({ default: '#FFFFFF' })
  topBarIconTextColor: string;

  // Status Bar Theme
  @Prop({ default: 'light' })  // Can be 'light' or 'dark'
  statusBarTheme: string;
}

export const MobileAppSchema = SchemaFactory.createForClass(MobileApp);

@Schema()
export class Repository extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  owner?: string;  // User ID

  @Prop({ type: [MobileAppSchema], default: [] })
  mobileApps: MobileApp[];
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
