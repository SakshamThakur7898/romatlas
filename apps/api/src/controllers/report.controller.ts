import type { RequestHandler } from 'express';
import { ReportModel, SubmissionModel } from '../models';
import { reportSchema, submissionSchema } from '../validators/schemas';
import { ok } from '../utils/response';
import { parseSubmissionPayload } from '../services/submission.service';

export const submitReport: RequestHandler = async (req, res) => {
  const body = reportSchema.parse(req.body);
  const report = await ReportModel.create({ ...body, userId: res.locals.userId });
  res.status(201).json(ok(report));
};

export const submitContribution: RequestHandler = async (req, res) => {
  const body = submissionSchema.parse(req.body);
  // Validate now so moderators only ever review well-formed data, and store the cleaned payload.
  const parsed = parseSubmissionPayload(body.type, body.payload);
  const submission = await SubmissionModel.create({ type: body.type, notes: body.notes, payload: parsed.data, userId: res.locals.userId });
  res.status(201).json(ok(submission));
};
