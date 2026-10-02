import { Schema, model } from 'mongoose';
import { RELIABILITY_TYPE, SOURCE_STATUS, SOURCE_TYPE } from './enums';
import { httpUrl } from './schemaTypes';

export interface ISource {
  name: string;
  url: string;
  type: string;
  domain?: string;
  reliabilityType: string;
  lastCheckedAt?: Date;
  lastHttpStatus?: number;
  contentHash?: string;
  status: string;
}

const sourceSchema = new Schema<ISource>(
  {
    name: { type: String, required: true, trim: true },
    url: { ...httpUrl, required: true, unique: true },
    type: { type: String, enum: SOURCE_TYPE, required: true },
    domain: { type: String, lowercase: true },
    reliabilityType: { type: String, enum: RELIABILITY_TYPE, default: 'THIRD_PARTY' },
    lastCheckedAt: Date,
    lastHttpStatus: Number,
    contentHash: String,
    status: { type: String, enum: SOURCE_STATUS, default: 'ACTIVE' },
  },
  { timestamps: true },
);

sourceSchema.pre('validate', function () {
  if (this.url && (this.isModified('url') || !this.domain)) {
    try {
      this.domain = new URL(this.url).hostname;
    } catch {
      /* the url validator reports the problem */
    }
  }
});

sourceSchema.index({ domain: 1 });
sourceSchema.index({ status: 1, lastCheckedAt: 1 });

export const SourceModel = model<ISource>('Source', sourceSchema);
