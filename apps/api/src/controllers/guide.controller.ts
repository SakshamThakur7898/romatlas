import type { RequestHandler } from 'express';
import { DeviceModel, GuideModel } from '../models';
import { guideInputSchema, guideQuerySchema, guideUpdateSchema } from '../validators/schemas';
import { AppError } from '../utils/errors';
import { ok, paginate } from '../utils/response';
import { writeAudit } from '../services/audit.service';

const isStaff = (role: unknown) => role === 'ADMIN' || role === 'MODERATOR';
const DEVICE_FIELDS = 'name brand codename brandSlug slug';

export const listGuides: RequestHandler = async (req, res) => {
  const { deviceId, category, difficulty, page, limit } = guideQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { status: 'PUBLISHED' };
  if (deviceId) filter.deviceId = deviceId;
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  const [data, total] = await Promise.all([
    GuideModel.find(filter)
      .select('-content')
      .populate('deviceId', DEVICE_FIELDS)
      .populate('romId', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    GuideModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

/** GET /api/guides/:deviceSlug/:guideSlug (matches /guides/poco-x3-nfc/lineageos-installation) */
export const getGuideBySlugs: RequestHandler = async (req, res) => {
  const devices = await DeviceModel.find({ slug: String(req.params.deviceSlug).toLowerCase() }).select('_id').lean();
  const guide = await GuideModel.findOne({
    deviceId: { $in: devices.map((d) => d._id) },
    slug: String(req.params.guideSlug).toLowerCase(),
    status: 'PUBLISHED',
  })
    .populate('deviceId', DEVICE_FIELDS)
    .populate('romId', 'name slug')
    .lean();
  if (!guide) throw new AppError(404, 'GUIDE_NOT_FOUND', 'Guide not found');
  res.json(ok(guide));
};

export const getGuideById: RequestHandler = async (req, res) => {
  const guide = await GuideModel.findById(req.params.id)
    .populate('deviceId', DEVICE_FIELDS)
    .populate('romId', 'name slug')
    .lean();
  // Drafts/outdated/archived guides are visible to staff only.
  if (!guide || (guide.status !== 'PUBLISHED' && !isStaff(res.locals.userRole))) {
    throw new AppError(404, 'GUIDE_NOT_FOUND', 'Guide not found');
  }
  res.json(ok(guide));
};

export const createGuide: RequestHandler = async (req, res) => {
  const input = guideInputSchema.parse(req.body);
  const guide = await GuideModel.create(input);
  await writeAudit({
    actorId: res.locals.userId, action: 'GUIDE_CREATED', targetType: 'Guide', targetId: guide.id, newValue: input,
  });
  res.status(201).json(ok(guide));
};

export const updateGuide: RequestHandler = async (req, res) => {
  const input = guideUpdateSchema.parse(req.body);
  const doc = await GuideModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'GUIDE_NOT_FOUND', 'Guide not found');
  const previousValue = Object.fromEntries(Object.keys(input).map((k) => [k, doc.get(k)]));
  doc.set(input);
  await doc.save();
  await writeAudit({
    actorId: res.locals.userId, action: 'GUIDE_UPDATED', targetType: 'Guide',
    targetId: doc.id, previousValue, newValue: input,
  });
  res.json(ok(doc));
};

export const deleteGuide: RequestHandler = async (req, res) => {
  const doc = await GuideModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'GUIDE_NOT_FOUND', 'Guide not found');
  const previousValue = doc.toObject();
  await doc.deleteOne();
  await writeAudit({
    actorId: res.locals.userId, action: 'GUIDE_DELETED', targetType: 'Guide', targetId: doc.id, previousValue,
  });
  res.json(ok({ deleted: true }));
};
