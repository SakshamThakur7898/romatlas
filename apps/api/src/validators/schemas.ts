import { z } from 'zod';
import {
  DIFFICULTY, GUIDE_CATEGORY, GUIDE_STATUS, OFFICIAL_STATUS, REPORT_REASON, ROLES,
  ROM_STATUS, SOURCE_STATUS, SOURCE_TYPE, RELIABILITY_TYPE, TARGET_TYPE, UPDATE_TYPE,
} from '../models/enums';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const httpUrl = z
  .string()
  .max(2048)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL');
const page = z.coerce.number().int().min(1).max(10_000).default(1);
const limit = (def: number) => z.coerce.number().int().min(1).max(100).default(def);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, digits, underscores'),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

// ── Query strings ─────────────────────────────────────────────────────────────
export const paginationQuerySchema = z.object({
  page,
  limit: limit(20),
  status: z.string().max(30).optional(),
});
export const deviceQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  brand: z.string().max(60).optional(),
  supported: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page,
  limit: limit(20),
});
export const romQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ROM_STATUS).optional(),
  page,
  limit: limit(20),
});
export const guideQuerySchema = z.object({
  deviceId: objectIdSchema.optional(),
  category: z.enum(GUIDE_CATEGORY).optional(),
  difficulty: z.enum(DIFFICULTY).optional(),
  page,
  limit: limit(20),
});
export const updateQuerySchema = z.object({
  deviceId: objectIdSchema.optional(),
  romId: objectIdSchema.optional(),
  type: z.enum(UPDATE_TYPE).optional(),
  page,
  limit: limit(30),
});

// ── User actions ──────────────────────────────────────────────────────────────
export const reportSchema = z.object({
  targetType: z.enum(TARGET_TYPE),
  targetId: objectIdSchema,
  reason: z.enum(REPORT_REASON),
  description: z.string().trim().max(2000).optional(),
});
export const submissionSchema = z.object({
  type: z.enum(['DEVICE', 'ROM', 'GUIDE']),
  payload: z.record(z.unknown()),
  notes: z.string().trim().max(2000).optional(),
});
export const bookmarkSchema = z.object({ targetType: z.enum(TARGET_TYPE), targetId: objectIdSchema });
export const aiQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
  deviceId: objectIdSchema.optional(),
});

// ── Staff write inputs (.strict() rejects unknown keys = no mass assignment) ───
export const deviceInputSchema = z
  .object({
    brand: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(120),
    codename: z.string().trim().min(1).max(60),
    modelNumbers: z.array(z.string().trim().min(1).max(40)).max(50),
    aliases: z.array(z.string().trim().min(1).max(80)).max(50),
    image: httpUrl,
    releaseDate: z.coerce.date(),
    chipset: z.string().trim().max(80),
    architecture: z.enum(['arm64', 'arm', 'x86_64', 'x86']),
    bootloaderInformation: z.string().trim().max(2000),
    currentAndroidVersion: z.string().trim().max(20),
    supported: z.boolean(),
    description: z.string().trim().max(2000),
    officialSource: httpUrl,
  })
  .partial()
  .required({ brand: true, name: true, codename: true })
  .strict();
export const deviceUpdateSchema = deviceInputSchema.partial();

export const romInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80),
    logo: httpUrl,
    description: z.string().trim().max(2000),
    website: httpUrl,
    repository: httpUrl,
    documentation: httpUrl,
    officialStatus: z.enum(OFFICIAL_STATUS),
    supportedAndroidVersions: z.array(z.string().max(20)).max(30),
    maintainer: z.string().trim().max(120),
    status: z.enum(ROM_STATUS),
    sourceId: objectIdSchema,
  })
  .partial()
  .required({ name: true, slug: true })
  .strict();
export const romUpdateSchema = romInputSchema.partial();

export const guideInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(120),
    deviceId: objectIdSchema,
    romId: objectIdSchema,
    category: z.enum(GUIDE_CATEGORY),
    content: z.string().min(1).max(100_000),
    sourceUrl: httpUrl,
    author: z.string().trim().max(120),
    difficulty: z.enum(DIFFICULTY),
    estimatedTime: z.string().trim().max(40),
    lastReviewedAt: z.coerce.date(),
    status: z.enum(GUIDE_STATUS),
  })
  .partial()
  .required({ title: true, slug: true, deviceId: true, category: true, content: true, sourceUrl: true })
  .strict();
export const guideUpdateSchema = guideInputSchema.partial();

// ── Moderation / admin ────────────────────────────────────────────────────────
export const roleChangeSchema = z.object({ role: z.enum(ROLES) }).strict();
export const reportResolveSchema = z
  .object({ status: z.enum(['IN_REVIEW', 'RESOLVED', 'DISMISSED']) })
  .strict();
export const submissionReviewSchema = z
  .object({ status: z.enum(['APPROVED', 'REJECTED']), reviewNotes: z.string().trim().max(2000).optional() })
  .strict();
export const sourceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(SOURCE_TYPE),
    reliabilityType: z.enum(RELIABILITY_TYPE),
    status: z.enum(SOURCE_STATUS),
  })
  .partial()
  .strict();

export const syncTriggerSchema = z
  .object({ job: z.enum(['all', 'google-devices', 'lineage-wiki', 'rom-projects']).default('all'), force: z.boolean().default(false) })
  .strict();
