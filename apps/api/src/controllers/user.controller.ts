import type { RequestHandler } from 'express';
import { UserModel, DeviceModel, RomModel } from '../models';
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
  res.json(ok(user.bookmarks));
};
