import { Schema, model } from 'mongoose';
import { OFFICIAL_STATUS, ROM_STATUS } from './enums';
import { httpUrl } from './schemaTypes';

// Supported devices are derived from DeviceRomSupport (single source of truth), not stored here.
const romSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { ...httpUrl },
    description: { type: String, trim: true, maxlength: 2000 },
    website: { ...httpUrl },
    repository: { ...httpUrl },
    documentation: { ...httpUrl },
    officialStatus: { type: String, enum: OFFICIAL_STATUS, default: 'UNKNOWN' },
    supportedAndroidVersions: { type: [String], default: [] },
    maintainer: { type: String, trim: true },
    organization: { type: String, trim: true },
    telegramUrl: { ...httpUrl },
    discordUrl: { ...httpUrl },
    // Why `status` has its value (e.g. which GitHub signal it was derived from).
    statusNote: { type: String, trim: true, maxlength: 500 },
    lastCheckedAt: Date,
    status: { type: String, enum: ROM_STATUS, default: 'UNKNOWN' },
    sourceId: { type: Schema.Types.ObjectId, ref: 'Source' },
  },
  { timestamps: true },
);

romSchema.index({ name: 'text', description: 'text' });
romSchema.index({ status: 1 });

export const RomModel = model('Rom', romSchema);
