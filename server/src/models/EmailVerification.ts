import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailVerification extends Document {
  email: string;
  otp: string;
  verificationToken?: string;
  verified: boolean;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    verificationToken: {
      type: String,
      index: true,
      sparse: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index — MongoDB auto-deletes expired docs
    },
  },
  { timestamps: true }
);

export const EmailVerification = mongoose.model<IEmailVerification>(
  'EmailVerification',
  emailVerificationSchema
);
