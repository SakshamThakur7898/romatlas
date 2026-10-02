import type { RequestHandler } from 'express';
import {
  DeviceModel, DeviceRomSupportModel, RecoveryModel, KernelModel, GuideModel, UpdateEventModel,
} from '../models';
import { deviceInputSchema, deviceQuerySchema, deviceUpdateSchema } from '../validators/schemas';
import { AppError } from '../utils/errors';
import { ok, paginate } from '../utils/response';
import { deviceSearchFilter } from '../services/deviceSearch';
import { writeAudit } from '../services/audit.service';

async function requireDevice(id: string) {
  const device = await DeviceModel.findById(id).lean();
  if (!device) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  return device;
}

export const listDevices: RequestHandler = async (req, res) => {
  const { q, brand, supported, page, limit } = deviceQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (supported !== undefined) filter.supported = supported;
  if (brand) filter.brandSlug = brand.toLowerCase();
  if (q) Object.assign(filter, deviceSearchFilter(q));

  const [data, total] = await Promise.all([
    DeviceModel.find(filter).sort({ brand: 1, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    DeviceModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

/** Clean-URL lookup: GET /api/devices/lookup/:brand/:slug */
export const lookupDevice: RequestHandler = async (req, res) => {
  const device = await DeviceModel.findOne({
    brandSlug: String(req.params.brand).toLowerCase(),
    slug: String(req.params.slug).toLowerCase(),
  }).lean();
  if (!device) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  res.json(ok(device));
};

export const getDeviceById: RequestHandler = async (req, res) => {
  res.json(ok(await requireDevice(req.params.id as string)));
};

export const getDeviceRoms: RequestHandler = async (req, res) => {
  const device = await requireDevice(req.params.id as string);
  const supports = await DeviceRomSupportModel.find({ deviceId: device._id })
    .populate('romId')
    .sort({ androidVersion: -1 })
    .lean();
  res.json(ok(supports));
};

export const getDeviceRecoveries: RequestHandler = async (req, res) => {
  const device = await requireDevice(req.params.id as string);
  res.json(ok(await RecoveryModel.find({ deviceId: device._id }).lean()));
};

export const getDeviceKernels: RequestHandler = async (req, res) => {
  const device = await requireDevice(req.params.id as string);
  res.json(ok(await KernelModel.find({ deviceId: device._id }).lean()));
};

export const getDeviceGuides: RequestHandler = async (req, res) => {
  const device = await requireDevice(req.params.id as string);
  res.json(ok(await GuideModel.find({ deviceId: device._id, status: 'PUBLISHED' }).lean()));
};

export const getDeviceUpdates: RequestHandler = async (req, res) => {
  const device = await requireDevice(req.params.id as string);
  const updates = await UpdateEventModel.find({ deviceId: device._id })
    .sort({ detectedAt: -1 })
    .limit(50)
    .populate('romId', 'name slug')
    .populate('sourceId', 'name url')
    .lean();
  res.json(ok(updates));
};

// ── Staff CRUD (validated, audited) ───────────────────────────────────────────

export const createDevice: RequestHandler = async (req, res) => {
  const input = deviceInputSchema.parse(req.body);
  const device = await DeviceModel.create(input);
  await writeAudit({
    actorId: res.locals.userId, action: 'DEVICE_CREATED', targetType: 'Device',
    targetId: device.id, newValue: input,
  });
  res.status(201).json(ok(device));
};

export const updateDevice: RequestHandler = async (req, res) => {
  const input = deviceUpdateSchema.parse(req.body);
  const doc = await DeviceModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  const previousValue = Object.fromEntries(Object.keys(input).map((k) => [k, doc.get(k)]));
  doc.set(input);
  await doc.save(); // save() (not findByIdAndUpdate) so validators and the slug hook run
  await writeAudit({
    actorId: res.locals.userId, action: 'DEVICE_UPDATED', targetType: 'Device',
    targetId: doc.id, previousValue, newValue: input,
  });
  res.json(ok(doc));
};

export const deleteDevice: RequestHandler = async (req, res) => {
  const doc = await DeviceModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  const previousValue = doc.toObject();
  await Promise.all([
    DeviceRomSupportModel.deleteMany({ deviceId: doc._id }),
    RecoveryModel.deleteMany({ deviceId: doc._id }),
    KernelModel.deleteMany({ deviceId: doc._id }),
    GuideModel.deleteMany({ deviceId: doc._id }),
  ]);
  await doc.deleteOne();
  await writeAudit({
    actorId: res.locals.userId, action: 'DEVICE_DELETED', targetType: 'Device',
    targetId: doc.id, previousValue,
  });
  res.json(ok({ deleted: true }));
};
