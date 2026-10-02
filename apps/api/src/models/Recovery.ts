import { Schema, model } from 'mongoose';
import { SUPPORT_TYPE } from './enums';
import { httpUrl } from './schemaTypes';

const recoverySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, trim: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    supportType: { type: String, enum: SUPPORT_TYPE, required: true },
    sourceUrl: { ...httpUrl, required: true },
    downloadUrl: { ...httpUrl },
    lastCheckedAt: Date,
    lastVerifiedAt: Date,
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

recoverySchema.index({ deviceId: 1, name: 1 });

export const RecoveryModel = model('Recovery', recoverySchema);
