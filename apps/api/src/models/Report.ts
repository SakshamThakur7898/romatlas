import { Schema, model } from 'mongoose';
import { REPORT_REASON, REPORT_STATUS, TARGET_TYPE } from './enums';

const reportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: TARGET_TYPE, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASON, required: true },
    description: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: REPORT_STATUS, default: 'OPEN' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export const ReportModel = model('Report', reportSchema);
