import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDiagnosticLog extends Document {
  _id: Types.ObjectId;
  deviceId?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  event: string;
  timestamp?: string;
  data?: any;
  error?: string;
  bulkUpload?: boolean;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticLogSchema = new Schema<IDiagnosticLog>(
  {
    deviceId: { type: String, index: true },
    platform: { type: String },
    osVersion: { type: String },
    appVersion: { type: String },
    event: { type: String, required: true, index: true },
    timestamp: { type: String },
    data: { type: Schema.Types.Mixed },
    error: { type: String },
    bulkUpload: { type: Boolean, default: false, index: true },
    ip: { type: String },
  },
  { timestamps: true, collection: 'diagnostic_logs' }
);

DiagnosticLogSchema.index({ createdAt: -1 });

export const DiagnosticLog = mongoose.model<IDiagnosticLog>(
  'DiagnosticLog',
  DiagnosticLogSchema
);
