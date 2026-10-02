import type { RequestHandler } from 'express';
import { ReportModel, SubmissionModel } from '../models';
import { reportSchema, submissionSchema } from '../validators/schemas';
import { ok } from '../utils/response';

export const submitReport: RequestHandler = async (req, res) => {
  const body = reportSchema.parse(req.body);
  const report = await ReportModel.create({ ...body, userId: res.locals.userId });
  res.status(201).json(ok(report));
};

export const submitContribution: RequestHandler = async (req, res) => {
  const body = submissionSchema.parse(req.body);
  const submission = await SubmissionModel.create({ ...body, userId: res.locals.userId });
  res.status(201).json(ok(submission));
};
