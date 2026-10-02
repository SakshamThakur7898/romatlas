import { Schema, model } from 'mongoose';
import { BUILD_TYPE, SUPPORT_TYPE, VERIFICATION } from './enums';
import { httpUrl } from './schemaTypes';

const supportSchema = new Schema(
  {
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    romId: { type: Schema.Types.ObjectId, ref: 'Rom', required: true },
    supportType: { type: String, enum: SUPPORT_TYPE, required: true },
    androidVersion: { type: String, required: true, trim: true },
    buildType: { type: String, enum: BUILD_TYPE },
    sourceUrl: { ...httpUrl, required: true },
    downloadUrl: { ...httpUrl },
    documentationUrl: { ...httpUrl },
    maintainer: { type: String, trim: true },
    lastBuildDate: Date,
    lastCheckedAt: Date,
    lastVerifiedAt: Date,
    verificationStatus: { type: String, enum: VERIFICATION, default: 'UNVERIFIED' },
    notes: { type: String, trim: true, maxlength: 2000 },
    knownIssues: { type: [String], default: [] },
  },
  { timestamps: true },
);

supportSchema.index({ deviceId: 1, romId: 1, androidVersion: 1 }, { unique: true });
supportSchema.index({ romId: 1 });
supportSchema.index({ verificationStatus: 1, lastVerifiedAt: -1 });

export const DeviceRomSupportModel = model('DeviceRomSupport', supportSchema);
