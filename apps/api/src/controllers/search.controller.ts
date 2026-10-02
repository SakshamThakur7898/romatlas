import type { RequestHandler } from 'express';
import { z } from 'zod';
import { DeviceModel, GuideModel, RomModel, SourceModel } from '../models';
import { ok } from '../utils/response';
import { deviceSearchFilter, escapeRegex } from '../services/deviceSearch';

/** Public, real counts for the home page. */
export const publicStats: RequestHandler = async (_req, res) => {
  const [devices, roms, guides, sources] = await Promise.all([
    DeviceModel.estimatedDocumentCount(),
    RomModel.estimatedDocumentCount(),
    GuideModel.countDocuments({ status: 'PUBLISHED' }),
    SourceModel.estimatedDocumentCount(),
  ]);
  res.json(ok({ devices, roms, guides, sources }));
};

const searchQuery = z.object({ q: z.string().trim().min(2).max(100) });

/** Global search used by the Cmd+K overlay. */
export const globalSearch: RequestHandler = async (req, res) => {
  const { q } = searchQuery.parse(req.query);
  const [devices, roms] = await Promise.all([
    DeviceModel.find(deviceSearchFilter(q))
      .select('name brand brandSlug slug codename')
      .sort({ name: 1 })
      .limit(6)
      .lean(),
    RomModel.find({ name: { $regex: escapeRegex(q), $options: 'i' } })
      .select('name slug')
      .sort({ name: 1 })
      .limit(4)
      .lean(),
  ]);
  res.json(ok({ devices, roms }));
};
