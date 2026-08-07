import mongoose, { Schema, Document } from 'mongoose';

/**
 * Insight cache document interface
 */
export interface IInsightCache extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'daily' | 'weekly' | 'monthly';
  content: object;  // DailyInsightOutput | WeeklyForecastOutput | MonthlyReadingOutput
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insight cache schema
 */
const InsightCacheSchema = new Schema<IInsightCache>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly'],
      required: true 
    },
    content: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
    validUntil: { 
      type: Date, 
      required: true,
      index: true  // For efficient expiration queries
    }
  }, 
  { 
    timestamps: true 
  }
);

// Compound index for efficient lookups
InsightCacheSchema.index({ userId: 1, type: 1, validUntil: -1 });

/**
 * Insight cache model
 */
export const InsightCache = mongoose.model<IInsightCache>('InsightCache', InsightCacheSchema);
