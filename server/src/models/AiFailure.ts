import mongoose, { Schema, Document, Types } from 'mongoose';

export type AiFailureErrorType =
  | 'max_tokens_truncation'
  | 'json_parse_error'
  | 'claude_api_error'
  | 'timeout'
  | 'unknown';

export interface IAiFailure extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  readingType: string;
  errorType: AiFailureErrorType;
  errorMessage: string;
  responseLength?: number;
  responseSnippetStart?: string;
  responseSnippetEnd?: string;
  modelUsed?: string;
  maxTokensRequested?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AiFailureSchema = new Schema<IAiFailure>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    readingType: { type: String, required: true, index: true },
    errorType: {
      type: String,
      enum: [
        'max_tokens_truncation',
        'json_parse_error',
        'claude_api_error',
        'timeout',
        'unknown',
      ],
      required: true,
      index: true,
    },
    errorMessage: { type: String, required: true },
    responseLength: { type: Number },
    responseSnippetStart: { type: String },
    responseSnippetEnd: { type: String },
    modelUsed: { type: String },
    maxTokensRequested: { type: Number },
  },
  { timestamps: true, collection: 'ai_failures' }
);

AiFailureSchema.index({ createdAt: -1 });

export const AiFailure = mongoose.model<IAiFailure>('AiFailure', AiFailureSchema);
