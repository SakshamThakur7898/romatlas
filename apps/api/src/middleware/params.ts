import type { RequestParamHandler } from 'express';
import { AppError } from '../utils/errors';

export const objectIdParam: RequestParamHandler = (_req, _res, next, value) => {
  if (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) return next();
  return next(new AppError(400, 'INVALID_ID', 'Invalid id'));
};
