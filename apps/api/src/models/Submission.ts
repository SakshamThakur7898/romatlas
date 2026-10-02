import { Schema, model } from 'mongoose';
import { SUBMISSION_STATUS } from './enums';

// payload is validated with Zod per type in the service layer.
const submissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['DEVICE', 'ROM', 'DEVICE_ROM_SUPPORT', 'RECOVERY', 'KERNEL', 'GUIDE'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: SUBMISSION_STATUS, default: 'PENDING' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true, maxlength: 2000 },
    reviewedAt: Date,
  },
  { timestamps: true },
);

submissionSchema.index({ status: 1, createdAt: -1 });

export const SubmissionModel = model('Submission', submissionSchema);
