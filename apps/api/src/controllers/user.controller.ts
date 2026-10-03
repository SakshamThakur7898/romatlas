import type { RequestHandler } from 'express';
import { UserModel, DeviceModel, RomModel, UpdateEventModel } from '../models';
import { AppError } from '../utils/errors';
import { ok } from '../utils/response';
import { bookmarkSchema } from '../validators/schemas';

export const followDevice: RequestHandler = async (req, res) => {
  if (!(await DeviceModel.exists({ _id: req.params.id }))) {
    throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }
  await UserModel.updateOne({ _id: res.locals.userId }, { $addToSet: { followedDevices: req.params.id } });
  res.json(ok({ followed: true }));
};

export const unfollowDevice: RequestHandler = async (req, res) => {
  await UserModel.updateOne({ _id: res.locals.userId }, { $pull: { followedDevices: req.params.id } });
  res.json(ok({ followed: false }));
};

export const followRom: RequestHandler = async (req, res) => {
  if (!(await RomModel.exists({ _id: req.params.id }))) {
    throw new AppError(404, 'ROM_NOT_FOUND', 'ROM not found');
  }
  await UserModel.updateOne({ _id: res.locals.userId }, { $addToSet: { followedRoms: req.params.id } });
  res.json(ok({ followed: true }));
};

export const unfollowRom: RequestHandler = async (req, res) => {
  await UserModel.updateOne({ _id: res.locals.userId }, { $pull: { followedRoms: req.params.id } });
  res.json(ok({ followed: false }));
};

export const addBookmark: RequestHandler = async (req, res) => {
  const { targetType, targetId } = bookmarkSchema.parse(req.body);
  // $addToSet can't dedupe subdocuments that carry a createdAt, so check explicitly.
  const already = await UserModel.exists({ _id: res.locals.userId, 'bookmarks.targetId': targetId });
  if (!already) {
    await UserModel.updateOne(
      { _id: res.locals.userId },
      { $push: { bookmarks: { targetType, targetId, createdAt: new Date() } } },
    );
  }
  res.json(ok({ bookmarked: true }));
};

export const removeBookmark: RequestHandler = async (req, res) => {
  await UserModel.updateOne({ _id: res.locals.userId }, { $pull: { bookmarks: { targetId: req.params.targetId } } });
  res.json(ok({ bookmarked: false }));
};

export const getBookmarks: RequestHandler = async (_req, res) => {
  const user = await UserModel.findById(res.locals.userId).lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  const idsOf = (type: string) => user.bookmarks.filter((b) => b.targetType === type).map((b) => b.targetId);
  const [devices, roms] = await Promise.all([
    DeviceModel.find({ _id: { $in: idsOf('DEVICE') } }).select('name brand brandSlug slug codename').lean(),
    RomModel.find({ _id: { $in: idsOf('ROM') } }).select('name slug').lean(),
  ]);
  const deviceById = new Map(devices.map((d) => [String(d._id), d]));
  const romById = new Map(roms.map((r) => [String(r._id), r]));
  const data = user.bookmarks
    .map((b) => ({
      ...b,
      target:
        b.targetType === 'DEVICE' ? deviceById.get(String(b.targetId)) ?? null
        : b.targetType === 'ROM' ? romById.get(String(b.targetId)) ?? null
        : null,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  res.json(ok(data));
};

export const getFollowing: RequestHandler = async (_req, res) => {
  const user = await UserModel.findById(res.locals.userId)
    .populate('followedDevices', 'name brand brandSlug slug codename')
    .populate('followedRoms', 'name slug')
    .lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json(ok({ devices: user.followedDevices, roms: user.followedRoms }));
};

/** Recent changes for everything the user follows (derived from UpdateEvent; no separate store to drift). */
export const getNotifications: RequestHandler = async (_req, res) => {
  const user = await UserModel.findById(res.locals.userId).select('followedDevices followedRoms').lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.followedDevices.length + user.followedRoms.length === 0) {
    res.json(ok([]));
    return;
  }
  const events = await UpdateEventModel.find({
    detectedAt: { $gt: new Date(Date.now() - 30 * 86_400_000) },
    $or: [{ deviceId: { $in: user.followedDevices } }, { romId: { $in: user.followedRoms } }],
  })
    .sort({ detectedAt: -1 })
    .limit(30)
    .populate('deviceId', 'name brandSlug slug codename')
    .populate('romId', 'name slug')
    .populate('sourceId', 'name url')
    .lean();
  res.json(ok(events));
};
