import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Reading document interface
 */
export interface IReading extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'face' | 'palm-dominant' | 'palm-non-dominant' | 'combined' | 'daily' | 'weekly' | 'monthly';
  tier: 'free' | 'premium' | 'premium_plus';
  content: object;  // FaceReadingOutput or PalmReadingOutput
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reading schema
 */
const ReadingSchema = new Schema<IReading>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: ['face', 'palm-dominant', 'palm-non-dominant', 'combined', 'daily', 'weekly', 'monthly'],
      required: true 
    },
    tier: { 
      type: String, 
      enum: ['free', 'premium', 'premium_plus'],
      required: true 
    },
    content: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
    imageUrl: String
  },
  { 
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Convert ObjectId to string
        const transformed: any = {
          ...ret,
          _id: ret._id.toString(),
          userId: ret.userId.toString(),
        };

        // Format dates as ISO strings
        if (transformed.createdAt) {
          transformed.createdAt = transformed.createdAt.toISOString();
        }
        if (transformed.updatedAt) {
          transformed.updatedAt = transformed.updatedAt.toISOString();
        }

        // Remove __v
        delete transformed.__v;

        return transformed;
      },
    },
  }
);

// Index for efficient queries
ReadingSchema.index({ userId: 1, type: 1, createdAt: -1 });

/**
 * Reading model
 */
export const Reading = mongoose.model<IReading>('Reading', ReadingSchema);
