import type { RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models';
import { REFRESH_COOKIE, REFRESH_COOKIE_MAX_SEC, cookieOptions } from '../utils/jwt';
import { registerSchema, loginSchema } from '../validators/schemas';
import { AppError } from '../utils/errors';
import { ok } from '../utils/response';
import { issueTokens, revokeSession, rotateRefreshToken } from '../services/token.service';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('romatlas-dummy-password', 12);

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions(REFRESH_COOKIE_MAX_SEC));
}

export const register: RequestHandler = async (req, res) => {
  const { password, ...profile } = registerSchema.parse(req.body);
  const exists = await UserModel.exists({
    $or: [{ email: profile.email }, { username: profile.username }],
  });
  if (exists) throw new AppError(409, 'CONFLICT', 'Email or username already taken');

  const passwordHash = await bcrypt.hash(password, 12);
  // Role is never taken from the request: new accounts are always USER.
  const user = await UserModel.create({ ...profile, passwordHash, role: 'USER' });
  const { accessToken, refreshToken } = await issueTokens({ id: user.id, role: user.role as string });
  setRefreshCookie(res, refreshToken);
  res.status(201).json(ok({ user: user.toJSON(), accessToken }));
};

export const login: RequestHandler = async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await UserModel.findOne({ email: body.email }).select('+passwordHash');
  const valid = await bcrypt.compare(body.password, (user?.passwordHash as string | undefined) ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const { accessToken, refreshToken } = await issueTokens({ id: user.id, role: user.role as string });
  setRefreshCookie(res, refreshToken);
  res.json(ok({ user: user.toJSON(), accessToken }));
};

export const refresh: RequestHandler = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'No refresh token');
  const { accessToken, refreshToken } = await rotateRefreshToken(token);
  setRefreshCookie(res, refreshToken);
  res.json(ok({ accessToken }));
};

export const logout: RequestHandler = async (req, res) => {
  await revokeSession(req.cookies?.[REFRESH_COOKIE] as string | undefined);
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0));
  res.json(ok({ message: 'Logged out' }));
};

export const me: RequestHandler = async (_req, res) => {
  const user = await UserModel.findById(res.locals.userId).lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json(ok(user));
};
