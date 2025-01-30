import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OnboardingScreenCategory, OnboardingScreenType } from '../../../types/onboarding-screen.types';

export type OnboardingScreenDocument = OnboardingScreen & Document;

@Schema({ timestamps: true })
export class OnboardingScreen {
  @Prop({ required: true })
  appId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ type: String, enum: OnboardingScreenCategory, required: true })
  category: OnboardingScreenCategory;

  @Prop({ required: true })
  screenType: OnboardingScreenType;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: false })
  isCustom: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const OnboardingScreenSchema = SchemaFactory.createForClass(OnboardingScreen);