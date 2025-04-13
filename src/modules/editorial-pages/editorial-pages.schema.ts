import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EditorialPageDocument = EditorialPage & Document;

// Default template code for new pages
const defaultCode = `import React, { useState } from 'react';

/**
 * IMPORTANT: This component must be named "AppComponent" 
 * and exported as default to work properly in the preview
 */
export default function AppComponent() {
  // You can use React hooks as needed
  const [clicked, setClicked] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-4">
          {clicked ? "Thanks for clicking!" : "My Editorial Page"}
        </h1>
        <p className="text-gray-700 mb-4">
          Edit this component to create your editorial page. Remember to keep
          the component name as "AppComponent" and export it as default.
        </p>
        <button 
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          onClick={() => setClicked(true)}
        >
          {clicked ? "Clicked!" : "Read More"}
        </button>
      </div>
    </div>
  );
}`;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class EditorialPage {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 'New editorial page' })
  description: string;

  @Prop({ required: true, default: defaultCode })
  code: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'App' })
  appId: MongooseSchema.Types.ObjectId;

  @Prop()
  createdAt: string;

  @Prop()
  updatedAt: string;
}

export const EditorialPageSchema = SchemaFactory.createForClass(EditorialPage);