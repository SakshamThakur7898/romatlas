import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
};

const fail = (status: number, code: string, message: string, details?: unknown) => ({
  status,
  body: { success: false, error: { code, message, ...(details ? { details } : {}) } },
});

function toResponse(err: unknown) {
  if (err instanceof ZodError) return fail(400, 'VALIDATION_ERROR', 'Invalid request', err.flatten());
  if (err instanceof AppError) return fail(err.status, err.code, err.message);
  if (err instanceof mongoose.Error.CastError) return fail(400, 'INVALID_ID', 'Invalid identifier');
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return fail(400, 'VALIDATION_ERROR', 'Invalid data', details);
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: unknown; type?: unknown };
    if (e.code === 11000) return fail(409, 'DUPLICATE', 'A record with these unique values already exists');
    if (e.type === 'entity.parse.failed') return fail(400, 'INVALID_JSON', 'Request body is not valid JSON');
    if (e.type === 'entity.too.large') return fail(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  }
  return null;
}

// Express identifies error handlers by their 4-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const known = toResponse(err);
  if (known) {
    res.status(known.status).json(known.body);
    return;
  }
  logger.error({ err, requestId: res.locals.requestId }, 'Unhandled error');
  res
    .status(500)
    .json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
