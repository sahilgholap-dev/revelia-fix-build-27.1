import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { CompatibilityOutput, ReadingTier } from '../types/shared';

/**
 * Compatibility document interface
 */
export interface ICompatibility extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  partnerName: string;
  partnerImageUrl: string;
  partnerBirthData?: {
    date: Date;
    sunSign?: string;
    lifePathNumber?: number;
  };
  partnerBirthTime?: string;
  partnerBirthPlace?: string;
  relationshipType: 'love' | 'business' | 'sibling' | 'parent_child' | 'friend';
  relationshipSubType?: string;
  reading: CompatibilityOutput;
  tier: ReadingTier;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Compatibility model interface
 */
export interface ICompatibilityModel extends Model<ICompatibility> {}

/**
 * Compatibility schema
 */
const compatibilitySchema = new Schema<ICompatibility, ICompatibilityModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    partnerName: {
      type: String,
      required: true,
      trim: true,
    },
    partnerImageUrl: {
      type: String,
      required: true,
    },
    partnerBirthData: {
      date: Date,
      sunSign: String,
      lifePathNumber: Number,
    },
    partnerBirthTime: {
      type: String,
    },
    partnerBirthPlace: {
      type: String,
      trim: true,
    },
    relationshipType: {
      type: String,
      enum: ['love', 'business', 'sibling', 'parent_child', 'friend'],
      default: 'love',
    },
    relationshipSubType: {
      type: String,
      trim: true,
    },
    reading: {
      type: Schema.Types.Mixed,
      required: true,
    },
    tier: {
      type: String,
      enum: ['free', 'premium', 'premium_plus'],
      required: true,
    },
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

        // Format dates
        if (transformed.partnerBirthData?.date) {
          transformed.partnerBirthData.date = transformed.partnerBirthData.date
            .toISOString()
            .split('T')[0];
        }
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
compatibilitySchema.index({ userId: 1, createdAt: -1 });

/**
 * Compatibility model
 */
export const Compatibility = mongoose.model<ICompatibility, ICompatibilityModel>(
  'Compatibility',
  compatibilitySchema
);
