import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INameVariation {
  rank: number;
  suggestedName: string;
  changeDescription: string;
  newExpressionNumber: number;
  newSoulUrgeNumber: number;
  newPersonalityNumber: number;
  benefitSummary: string;
  impactAreas: string[];
}

export interface INameAnalysis extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;

  expressionNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;

  currentNameAnalysis: {
    expressionMeaning: string;
    soulUrgeMeaning: string;
    personalityMeaning: string;
    overallAssessment: string;
    strengths: string[];
    challenges: string[];
  };

  nameVariations: INameVariation[];

  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const nameAnalysisSchema = new Schema<INameAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },

    expressionNumber: { type: Number, required: true },
    soulUrgeNumber: { type: Number, required: true },
    personalityNumber: { type: Number, required: true },

    currentNameAnalysis: {
      expressionMeaning: String,
      soulUrgeMeaning: String,
      personalityMeaning: String,
      overallAssessment: String,
      strengths: [String],
      challenges: [String],
    },

    nameVariations: [{
      rank: Number,
      suggestedName: String,
      changeDescription: String,
      newExpressionNumber: Number,
      newSoulUrgeNumber: Number,
      newPersonalityNumber: Number,
      benefitSummary: String,
      impactAreas: [String],
    }],

    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret._id = ret._id.toString();
        ret.userId = ret.userId.toString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.generatedAt) ret.generatedAt = ret.generatedAt.toISOString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

nameAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const NameAnalysis = mongoose.model<INameAnalysis>('NameAnalysis', nameAnalysisSchema);
