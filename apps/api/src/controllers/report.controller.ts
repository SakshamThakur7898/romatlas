import type { RequestHandler } from 'express';
import { ReportModel, SubmissionModel } from '../models';
import { reportSchema, submissionSchema } from '../validators/schemas';
import { ok } from '../utils/response';
import { assertReferencesExist, parseSubmissionPayload } from '../services/submission.service';
import { AppError } from '../utils/errors';

const MAX_PENDING_PER_USER = 20;

export const submitReport: RequestHandler = async (req, res) => {
  const body = reportSchema.parse(req.body);
  const report = await ReportModel.create({ ...body, userId: res.locals.userId });
  res.status(201).json(ok(report));
};

export const submitContribution: RequestHandler = async (req, res) => {
  const body = submissionSchema.parse(req.body);
  if ((await SubmissionModel.countDocuments({ userId: res.locals.userId, status: 'PENDING' })) >= MAX_PENDING_PER_USER) {
    throw new AppError(429, 'TOO_MANY_PENDING', 'You have many submissions awaiting review. Please wait for moderators to catch up.');
  }
  // Validate now so moderators only ever review well-formed data, and store the cleaned payload.
  const parsed = parseSubmissionPayload(body.type, body.payload);
  await assertReferencesExist(parsed);
  const submission = await SubmissionModel.create({ type: body.type, notes: body.notes, payload: parsed.data, userId: res.locals.userId });
  res.status(201).json(ok(submission));
};
