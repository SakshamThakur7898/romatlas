import { Schema, model } from 'mongoose';
import { SYNC_STATUS } from './enums';

const syncJobSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: SYNC_STATUS, required: true },
  startedAt: { type: Date, required: true },
  finishedAt: Date,
  stats: Schema.Types.Mixed,
  error: String,
  triggeredBy: { type: String, default: 'cli' },
});

syncJobSchema.index({ startedAt: -1 });
syncJobSchema.index({ name: 1, status: 1, startedAt: -1 });

export const SyncJobModel = model('SyncJob', syncJobSchema);
