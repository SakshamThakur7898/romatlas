import type { RequestHandler } from 'express';
import { RomModel, DeviceRomSupportModel } from '../models';
import { romInputSchema, romQuerySchema, romUpdateSchema } from '../validators/schemas';
import { AppError } from '../utils/errors';
import { ok, paginate } from '../utils/response';
import { escapeRegex } from '../services/deviceSearch';
import { writeAudit } from '../services/audit.service';

async function requireRomBySlug(slug: string) {
  const rom = await RomModel.findOne({ slug: slug.toLowerCase() }).lean();
  if (!rom) throw new AppError(404, 'ROM_NOT_FOUND', 'ROM not found');
  return rom;
}

export const listRoms: RequestHandler = async (req, res) => {
  const { q, status, page, limit } = romQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const [data, total] = await Promise.all([
    RomModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    RomModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

export const getRom: RequestHandler = async (req, res) => {
  res.json(ok(await requireRomBySlug(req.params.slug as string)));
};

export const getRomDevices: RequestHandler = async (req, res) => {
  const rom = await requireRomBySlug(req.params.slug as string);
  const supports = await DeviceRomSupportModel.find({ romId: rom._id })
    .populate('deviceId')
    .sort({ androidVersion: -1 })
    .lean();
  res.json(ok(supports));
};

export const createRom: RequestHandler = async (req, res) => {
  const input = romInputSchema.parse(req.body);
  const rom = await RomModel.create(input);
  await writeAudit({
    actorId: res.locals.userId, action: 'ROM_CREATED', targetType: 'Rom', targetId: rom.id, newValue: input,
  });
  res.status(201).json(ok(rom));
};

export const updateRom: RequestHandler = async (req, res) => {
  const input = romUpdateSchema.parse(req.body);
  const doc = await RomModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'ROM_NOT_FOUND', 'ROM not found');
  const previousValue = Object.fromEntries(Object.keys(input).map((k) => [k, doc.get(k)]));
  doc.set(input);
  await doc.save();
  await writeAudit({
    actorId: res.locals.userId, action: 'ROM_UPDATED', targetType: 'Rom',
    targetId: doc.id, previousValue, newValue: input,
  });
  res.json(ok(doc));
};

export const deleteRom: RequestHandler = async (req, res) => {
  const doc = await RomModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'ROM_NOT_FOUND', 'ROM not found');
  const previousValue = doc.toObject();
  await DeviceRomSupportModel.deleteMany({ romId: doc._id });
  await doc.deleteOne();
  await writeAudit({
    actorId: res.locals.userId, action: 'ROM_DELETED', targetType: 'Rom', targetId: doc.id, previousValue,
  });
  res.json(ok({ deleted: true }));
};
