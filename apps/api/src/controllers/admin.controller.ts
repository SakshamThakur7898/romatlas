import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import {
  DeviceModel, RomModel, GuideModel, RecoveryModel, KernelModel, SourceModel, UpdateEventModel,
  UserModel, ReportModel, SubmissionModel, AuditLogModel,
} from '../models';
import { AppError } from '../utils/errors';
import { ok, paginate } from '../utils/response';
import {
  paginationQuerySchema, reportResolveSchema, roleChangeSchema, sourceUpdateSchema, submissionReviewSchema,
} from '../validators/schemas';
import { writeAudit } from '../services/audit.service';

export const getStats: RequestHandler = async (_req, res) => {
  const [devices, roms, guides, recoveries, kernels, sources, updates, users, openReports, pendingSubmissions] =
    await Promise.all([
      DeviceModel.estimatedDocumentCount(),
      RomModel.estimatedDocumentCount(),
      GuideModel.countDocuments({ status: 'PUBLISHED' }),
      RecoveryModel.estimatedDocumentCount(),
      KernelModel.estimatedDocumentCount(),
      SourceModel.estimatedDocumentCount(),
      UpdateEventModel.estimatedDocumentCount(),
      UserModel.estimatedDocumentCount(),
      ReportModel.countDocuments({ status: 'OPEN' }),
      SubmissionModel.countDocuments({ status: 'PENDING' }),
    ]);
  res.json(ok({ devices, roms, guides, recoveries, kernels, sources, updates, users, openReports, pendingSubmissions }));
};

export const listUsers: RequestHandler = async (req, res) => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const [data, total] = await Promise.all([
    UserModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    UserModel.estimatedDocumentCount(),
  ]);
  res.json(paginate(data, total, page, limit));
};

export const updateUserRole: RequestHandler = async (req, res) => {
  const { role } = roleChangeSchema.parse(req.body);
  if (req.params.id === res.locals.userId) {
    throw new AppError(400, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
  }
  const user = await UserModel.findById(req.params.id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  const previousRole = user.role;
  user.role = role;
  await user.save();
  await writeAudit({
    actorId: res.locals.userId, action: 'USER_ROLE_CHANGED', targetType: 'User', targetId: user.id,
    previousValue: { role: previousRole }, newValue: { role },
  });
  res.json(ok(user));
};

export const listReports: RequestHandler = async (req, res) => {
  const { page, limit, status } = paginationQuerySchema.parse(req.query);
  const filter = status ? { status } : {};
  const [data, total] = await Promise.all([
    ReportModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'name username').lean(),
    ReportModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

export const resolveReport: RequestHandler = async (req, res) => {
  const { status } = reportResolveSchema.parse(req.body);
  const report = await ReportModel.findById(req.params.id);
  if (!report) throw new AppError(404, 'NOT_FOUND', 'Report not found');
  const previousStatus = report.status;
  report.status = status;
  if (status !== 'IN_REVIEW') {
    report.resolvedBy = new Types.ObjectId(res.locals.userId);
    report.resolvedAt = new Date();
  }
  await report.save();
  await writeAudit({
    actorId: res.locals.userId, action: 'REPORT_UPDATED', targetType: 'Report', targetId: report.id,
    previousValue: { status: previousStatus }, newValue: { status },
  });
  res.json(ok(report));
};

export const listSubmissions: RequestHandler = async (req, res) => {
  const { page, limit, status } = paginationQuerySchema.parse(req.query);
  const filter = status ? { status } : {};
  const [data, total] = await Promise.all([
    SubmissionModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'name username').lean(),
    SubmissionModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

export const reviewSubmission: RequestHandler = async (req, res) => {
  const { status, reviewNotes } = submissionReviewSchema.parse(req.body);
  // Only PENDING submissions can be decided, atomically, so two moderators can't both act.
  const submission = await SubmissionModel.findOneAndUpdate(
    { _id: req.params.id, status: 'PENDING' },
    { status, reviewNotes, reviewedBy: res.locals.userId, reviewedAt: new Date() },
    { new: true },
  ).lean();
  if (!submission) {
    const exists = await SubmissionModel.exists({ _id: req.params.id });
    throw exists
      ? new AppError(409, 'ALREADY_REVIEWED', 'Submission has already been reviewed')
      : new AppError(404, 'NOT_FOUND', 'Submission not found');
  }
  await writeAudit({
    actorId: res.locals.userId, action: 'SUBMISSION_REVIEWED', targetType: 'Submission', targetId: String(submission._id),
    previousValue: { status: 'PENDING' }, newValue: { status },
  });
  res.json(ok(submission));
};

export const listSources: RequestHandler = async (req, res) => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const [data, total] = await Promise.all([
    SourceModel.find().sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SourceModel.estimatedDocumentCount(),
  ]);
  res.json(paginate(data, total, page, limit));
};

export const updateSource: RequestHandler = async (req, res) => {
  const input = sourceUpdateSchema.parse(req.body);
  const doc = await SourceModel.findById(req.params.id);
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'Source not found');
  const previousValue = Object.fromEntries(Object.keys(input).map((k) => [k, doc.get(k)]));
  doc.set(input);
  await doc.save();
  await writeAudit({
    actorId: res.locals.userId, action: 'SOURCE_UPDATED', targetType: 'Source', targetId: doc.id,
    previousValue, newValue: input,
  });
  res.json(ok(doc));
};

export const listAuditLogs: RequestHandler = async (req, res) => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const [data, total] = await Promise.all([
    AuditLogModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('actorId', 'name username role').lean(),
    AuditLogModel.estimatedDocumentCount(),
  ]);
  res.json(paginate(data, total, page, limit));
};
