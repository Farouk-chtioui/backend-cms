import * as mongoose from 'mongoose';

/**
 * Mongoose schema for the HeaderConfig
 * This is used as a subdocument in the WidgetScreenSchema
 */
export const HeaderConfigSchema = new mongoose.Schema({
  type: { 
    type: String,
    enum: ['image', 'logo', 'gradient'],
    required: true
  },
  title: String,
  subtitle: String,
  imageUrl: String,
  logoUrl: String,
  gradientColors: {
    from: String,
    to: String,
    angle: Number
  },
  overlayOpacity: Number,
  textColor: String,
  showText: Boolean,
  fontStyle: { 
    type: String,
    enum: ['modern', 'classic', 'display', 'graffiti']
  },
  mobileLayout: { 
    type: String,
    enum: ['centered', 'bottom', 'overlay']
  },
  borderRadius: { 
    type: String,
    enum: ['none', 'small', 'medium', 'large', 'full']
  },
  frame: { 
    type: String,
    enum: ['none', 'simple', 'shadow', 'floating']
  },
  festivalDates: {
    start: String,
    end: String
  },
  showDates: Boolean,
  showCountdown: Boolean,
  isFullWidth: Boolean,
  imagePosition: {
    x: Number,
    y: Number,
    scale: Number
  },
  socialLinks: {
    instagram: String,
    twitter: String,
    facebook: String,
    spotify: String
  },
  customStyles: {
    headerHeight: String,
    contentPadding: String,
    textShadow: Boolean,
    backgroundBlur: Boolean
  },
  interactions: {
    enableShare: Boolean,
    enableSave: Boolean,
    enableNotifications: Boolean
  }
}, { _id: false }); // _id: false prevents MongoDB from creating an _id for this subdocument