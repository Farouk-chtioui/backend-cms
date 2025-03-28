import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class AppLayout extends Document {
  @Prop({ type: Types.ObjectId, ref: 'MobileApp', required: true })
  appId: Types.ObjectId;

  @Prop({ type: String, required: true }) // e.g., 'tabs', 'default'
  layoutType: string;

  @Prop({
    type: [
      {
        name: String,
        iconName: String,
        visible: Boolean,
        isHome: Boolean,
        iconCategory: {
          type: String,
          enum: ['outline', 'solid', 'mini'],
          default: 'outline',
        },
        routeType: {
          type: String,
          enum: ['screen', 'external'],
          default: 'screen',
        },
        route: String,
        screenId: { 
          type: Types.ObjectId, 
          ref: 'Screen', 
          required: false,
          // Add this check function to handle empty strings
          validate: {
            validator: function(v) {
              // Allow null, undefined, or valid ObjectId
              return v === null || v === undefined || Types.ObjectId.isValid(v);
            },
            message: props => `${props.value} is not a valid ObjectId or null value`
          }
        },
      },
    ],
    default: [],
  })
  bottomBarTabs: {
    name: string;
    iconName: string;
    visible: boolean;
    isHome: boolean;
    iconCategory: 'outline' | 'solid' | 'mini';
    routeType: 'screen' | 'external';
    route: string;
    screenId?: Types.ObjectId;
  }[];
}

export const AppLayoutSchema = SchemaFactory.createForClass(AppLayout);
