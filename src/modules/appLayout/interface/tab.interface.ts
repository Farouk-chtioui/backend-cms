import { Document } from 'mongoose';

export interface Tab extends Document {
  name: string;
  icon: string;
  visible: boolean;
  isHome: boolean;
}
