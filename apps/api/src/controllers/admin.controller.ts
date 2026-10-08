import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import {
  DeviceModel, RomModel, GuideModel, RecoveryModel, KernelModel, SourceModel, UpdateEventModel,
  UserModel, ReportModel, SubmissionModel, AuditLogModel, SyncJobModel,
} from '../models';
import { AppError } from '../utils/errors';
import { ok, paginate } from '../utils/response';
import {
  paginationQuerySchema, reportResolveSchema, roleChangeSchema, sourceUpdateSchema, submissionReviewSchema, syncTriggerSchema,
} from '../validators/schemas';
import { writeAudit } from '../services/audit.service';
import { applySubmission, parseSubmissionPayload } from '../services/submission.service';
import { runAllSyncJobs, runSyncJob, SYNC_ORDER } from '../services/sync.service';
import { logger } from '../utils/logger';

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
  const [rows, total] = await Promise.all([
    ReportModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'name username').lean(),
    ReportModel.countDocuments(filter),
  ]);
  // Resolve DEVICE/ROM targets so moderators see names and can jump to the page.
  const ids = (type: string) => rows.filter((r) => r.targetType === type).map((r) => r.targetId);
  const [devices, roms] = await Promise.all([
    DeviceModel.find({ _id: { $in: ids('DEVICE') } }).select('name brandSlug slug codename').lean(),
    RomModel.find({ _id: { $in: ids('ROM') } }).select('name slug').lean(),
  ]);
  const deviceById = new Map(devices.map((d) => [String(d._id), d]));
  const romById = new Map(roms.map((r) => [String(r._id), r]));
  const data = rows.map((r) => {
    const d = r.targetType === 'DEVICE' ? deviceById.get(String(r.targetId)) : undefined;
    const rom = r.targetType === 'ROM' ? romById.get(String(r.targetId)) : undefined;
    const target = d
      ? { name: `${d.name} (${d.codename})`, path: `/devices/${d.brandSlug}/${d.slug}` }
      : rom ? { name: rom.name, path: `/roms/${rom.slug}` } : null;
    return { ...r, target };
  });
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
  const [rows, total] = await Promise.all([
    SubmissionModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('userId', 'name username').lean(),
    SubmissionModel.countDocuments(filter),
  ]);
  // Name the device/ROM a submission refers to, so moderators don't have to read raw ids.
  const payloadOf = (r: (typeof rows)[number]) => (r.payload ?? {}) as Record<string, unknown>;
  const ids = (key: string) => rows.map((r) => payloadOf(r)[key]).filter((v): v is string => typeof v === 'string');
  const [devices, roms] = await Promise.all([
    DeviceModel.find({ _id: { $in: ids('deviceId') } }).select('name codename').lean(),
    RomModel.find({ _id: { $in: ids('romId') } }).select('name').lean(),
  ]);
  const deviceName = new Map(devices.map((d) => [String(d._id), `${d.name} (${d.codename})`]));
  const romName = new Map(roms.map((r) => [String(r._id), r.name]));
  const data = rows.map((r) => ({
    ...r,
    context: { device: deviceName.get(String(payloadOf(r).deviceId)), rom: romName.get(String(payloadOf(r).romId)) },
  }));
  res.json(paginate(data, total, page, limit));
};

export const reviewSubmission: RequestHandler = async (req, res) => {
  const { status, reviewNotes } = submissionReviewSchema.parse(req.body);
  const existing = await SubmissionModel.findById(req.params.id).lean();
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Submission not found');
  if (existing.status !== 'PENDING') throw new AppError(409, 'ALREADY_REVIEWED', 'Submission has already been reviewed');

  // Validate before claiming, so an invalid payload leaves the submission pending instead of half-approved.
  const parsed = status === 'APPROVED' ? parseSubmissionPayload(existing.type as string, existing.payload) : null;

  // Atomic claim: only one moderator can decide a submission.
  const claimed = await SubmissionModel.findOneAndUpdate(
    { _id: existing._id, status: 'PENDING' },
    { status, reviewNotes, reviewedBy: res.locals.userId, reviewedAt: new Date() },
    { new: true },
  ).lean();
  if (!claimed) throw new AppError(409, 'ALREADY_REVIEWED', 'Submission has already been reviewed');

  let created: { targetType: string; targetId: string } | null = null;
  if (parsed) {
    try {
      created = await applySubmission(parsed);
    } catch (err) {
      // e.g. duplicate codename/slug: put it back in the queue so nothing is lost, then report the cause.
      await SubmissionModel.updateOne(
        { _id: existing._id },
        { status: 'PENDING', $unset: { reviewedBy: 1, reviewedAt: 1, reviewNotes: 1 } },
      );
      throw err;
    }
  }
  await writeAudit({
    actorId: res.locals.userId, action: 'SUBMISSION_REVIEWED', targetType: 'Submission', targetId: String(claimed._id),
    previousValue: { status: 'PENDING' }, newValue: { status, created },
  });
  res.json(ok({ ...claimed, created }));
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

export const triggerSync: RequestHandler = async (req, res) => {
  const { job, force } = syncTriggerSchema.parse(req.body ?? {});
  const names = job === 'all' ? SYNC_ORDER : [job];
  const running = await SyncJobModel.exists({ status: 'RUNNING', startedAt: { $gt: new Date(Date.now() - 30 * 60_000) } });
  if (running) throw new AppError(409, 'SYNC_RUNNING', 'A sync is already running');

  const triggeredBy = String(res.locals.userId);
  // Imports can take minutes: run in the background and let the client poll /sync/history.
  const work = job === 'all' ? runAllSyncJobs({ force, triggeredBy }) : runSyncJob(job, { force, triggeredBy });
  void Promise.resolve(work).catch((err) => logger.error({ err }, 'background sync failed'));

  await writeAudit({ actorId: res.locals.userId, action: 'SYNC_TRIGGERED', newValue: { job, force } });
  res.status(202).json(ok({ started: names, force }));
};

export const syncHistory: RequestHandler = async (req, res) => {
  const { page, limit, status } = paginationQuerySchema.parse(req.query);
  const filter = status ? { status } : {};
  const [data, total] = await Promise.all([
    SyncJobModel.find(filter).sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SyncJobModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};

/** All guides including drafts and outdated ones (the public list shows published only). */
export const listAllGuides: RequestHandler = async (req, res) => {
  const { page, limit, status } = paginationQuerySchema.parse(req.query);
  const filter = status ? { status } : {};
  const [data, total] = await Promise.all([
    GuideModel.find(filter).select('-content').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('deviceId', 'name codename brandSlug slug').lean(),
    GuideModel.countDocuments(filter),
  ]);
  res.json(paginate(data, total, page, limit));
};
