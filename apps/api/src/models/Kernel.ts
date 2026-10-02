import { Schema, model } from 'mongoose';
import { COMPONENT_STATUS } from './enums';
import { httpUrl } from './schemaTypes';

const kernelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    version: { type: String, trim: true },
    sourceRepository: { ...httpUrl, required: true },
    downloadUrl: { ...httpUrl },
    maintainer: { type: String, trim: true },
    androidVersion: { type: String, trim: true },
    lastUpdated: Date,
    lastCheckedAt: Date,
    status: { type: String, enum: COMPONENT_STATUS, default: 'UNKNOWN' },
  },
  { timestamps: true },
);

kernelSchema.index({ deviceId: 1, name: 1 });

export const KernelModel = model('Kernel', kernelSchema);
