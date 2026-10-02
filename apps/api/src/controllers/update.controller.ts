import type { RequestHandler } from 'express';
import { UpdateEventModel } from '../models';
import { updateQuerySchema } from '../validators/schemas';
import { paginate } from '../utils/response';

export const listUpdates: RequestHandler = async (req, res) => {
  const { deviceId, romId, type, page, limit } = updateQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (deviceId) filter.deviceId = deviceId;
  if (romId) filter.romId = romId;
  if (type) filter.updateType = type;
  const [data, total] = await Promise.all([
    UpdateEventModel.find(filter)
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('deviceId', 'name brand codename brandSlug slug')
      .populate('romId', 'name slug')
      .populate('sourceId', 'name url')
      .lean(),
    UpdateEventModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};
