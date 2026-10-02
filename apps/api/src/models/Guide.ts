import { Schema, model } from 'mongoose';
import { DIFFICULTY, GUIDE_CATEGORY, GUIDE_STATUS } from './enums';
import { httpUrl } from './schemaTypes';

const guideSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    romId: { type: Schema.Types.ObjectId, ref: 'Rom' },
    category: { type: String, enum: GUIDE_CATEGORY, required: true },
    content: { type: String, required: true },
    sourceUrl: { ...httpUrl, required: true },
    author: { type: String, trim: true },
    difficulty: { type: String, enum: DIFFICULTY, default: 'ADVANCED' },
    estimatedTime: { type: String, trim: true },
    lastReviewedAt: Date,
    status: { type: String, enum: GUIDE_STATUS, default: 'DRAFT' },
  },
  { timestamps: true },
);

guideSchema.index({ deviceId: 1, slug: 1 }, { unique: true });
guideSchema.index({ category: 1, status: 1 });
guideSchema.index({ title: 'text', content: 'text' });

export const GuideModel = model('Guide', guideSchema);
