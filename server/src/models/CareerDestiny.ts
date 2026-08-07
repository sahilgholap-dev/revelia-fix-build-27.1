import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICareerPath {
  rank: number;
  title: string;
  field: string;
  confidenceScore: number;
  description: string;
  alignedTraits: string[];
  growthPotential: string;
  icon: string;
}

export interface INonTraditionalPath {
  title: string;
  description: string;
  alignedTraits: string[];
  icon: string;
}

export interface ICareerDestiny extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  inputData: {
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    lifePathNumber?: number;
    expressionNumber?: number;
    faceArchetype?: string;
    palmType?: string;
    hasFaceReading: boolean;
    hasPalmReading: boolean;
  };

  careerProfile: {
    summary: string;
    coreStrengths: string[];
    workStyle: string;
    leadershipStyle: string;
  };

  careers: ICareerPath[];
  nonTraditionalPaths: INonTraditionalPath[];
  actionAdvice: string;

  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const careerDestinySchema = new Schema<ICareerDestiny>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    inputData: {
      sunSign: String,
      moonSign: String,
      risingSign: String,
      lifePathNumber: Number,
      expressionNumber: Number,
      faceArchetype: String,
      palmType: String,
      hasFaceReading: { type: Boolean, default: false },
      hasPalmReading: { type: Boolean, default: false },
    },

    careerProfile: {
      summary: String,
      coreStrengths: [String],
      workStyle: String,
      leadershipStyle: String,
    },

    careers: [{
      rank: Number,
      title: String,
      field: String,
      confidenceScore: Number,
      description: String,
      alignedTraits: [String],
      growthPotential: String,
      icon: String,
    }],

    nonTraditionalPaths: [{
      title: String,
      description: String,
      alignedTraits: [String],
      icon: String,
    }],

    actionAdvice: String,

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

careerDestinySchema.index({ userId: 1, createdAt: -1 });

export const CareerDestiny = mongoose.model<ICareerDestiny>('CareerDestiny', careerDestinySchema);
