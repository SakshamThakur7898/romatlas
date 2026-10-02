import { Schema, model } from 'mongoose';
import { UPDATE_TYPE } from './enums';
import { httpUrl } from './schemaTypes';

const updateEventSchema = new Schema({
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
  romId: { type: Schema.Types.ObjectId, ref: 'Rom' },
  sourceId: { type: Schema.Types.ObjectId, ref: 'Source', required: true },
  updateType: { type: String, enum: UPDATE_TYPE, required: true },
  previousValue: String,
  newValue: String,
  detectedAt: { type: Date, default: Date.now },
  sourceUrl: { ...httpUrl, required: true },
});

updateEventSchema.index({ detectedAt: -1 });
updateEventSchema.index({ deviceId: 1, detectedAt: -1 });
updateEventSchema.index({ romId: 1, detectedAt: -1 });

export const UpdateEventModel = model('UpdateEvent', updateEventSchema);
