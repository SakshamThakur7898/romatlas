import { describe, expect, it } from 'vitest';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { authenticate, requireRole } from '../src/middleware/auth';
import { objectIdParam } from '../src/middleware/params';
import { errorHandler, notFound } from '../src/middleware/errorHandler';
import { signAccess } from '../src/utils/jwt';
import { deviceSearchFilter, escapeRegex } from '../src/services/deviceSearch';
import {
  aiQuerySchema, bookmarkSchema, deviceInputSchema, guideInputSchema, registerSchema, roleChangeSchema,
} from '../src/validators/schemas';

function buildApp() {
  const app = express();
  app.get('/me', authenticate, (_req, res) => res.json({ ok: true }));
  app.get('/admin', authenticate, requireRole('ADMIN'), (_req, res) => res.json({ ok: true }));
  const things = express.Router();
  things.param('id', objectIdParam);
  things.get('/:id', (req, res) => res.json({ id: req.params.id }));
  app.use('/things', things);
  app.get('/cast', () => {
    throw new mongoose.Error.CastError('ObjectId', 'abc', '_id');
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const token = (role: string) => signAccess({ userId: '64b7f0c2a1b2c3d4e5f60718', role });

describe('authentication and RBAC', () => {
  const app = buildApp();

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('forbids a USER from admin routes and allows an ADMIN', async () => {
    const asUser = await request(app).get('/admin').set('Authorization', `Bearer ${token('USER')}`);
    expect(asUser.status).toBe(403);
    const asAdmin = await request(app).get('/admin').set('Authorization', `Bearer ${token('ADMIN')}`);
    expect(asAdmin.status).toBe(200);
  });
});

describe('error handling', () => {
  const app = buildApp();

  it('returns 400 for a malformed ObjectId param instead of crashing', async () => {
    const res = await request(app).get('/things/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('accepts a valid ObjectId param', async () => {
    const res = await request(app).get('/things/64b7f0c2a1b2c3d4e5f60718');
    expect(res.status).toBe(200);
  });

  it('maps mongoose CastError to 400', async () => {
    const res = await request(app).get('/cast');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });
});

describe('input validation', () => {
  it('rejects unknown keys on staff inputs (mass assignment)', () => {
    const base = { brand: 'Xiaomi', name: 'POCO X3 NFC', codename: 'surya' };
    expect(deviceInputSchema.safeParse(base).success).toBe(true);
    expect(deviceInputSchema.safeParse({ ...base, slug: 'hijack' }).success).toBe(false);
    expect(deviceInputSchema.safeParse({ ...base, officialSource: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('requires core guide fields and a valid category', () => {
    expect(guideInputSchema.safeParse({ title: 'x' }).success).toBe(false);
  });

  it('does not accept a role during registration', () => {
    const parsed = registerSchema.parse({
      name: 'Alice', username: 'alice', email: 'A@B.co', password: 'longenough', role: 'ADMIN',
    });
    expect('role' in parsed).toBe(false);
  });

  it('only allows known roles when changing a role', () => {
    expect(roleChangeSchema.safeParse({ role: 'SUPERUSER' }).success).toBe(false);
    expect(roleChangeSchema.safeParse({ role: 'MODERATOR' }).success).toBe(true);
  });

  it('rejects non-ObjectId ids in bookmarks and AI queries', () => {
    expect(bookmarkSchema.safeParse({ targetType: 'DEVICE', targetId: 'abc' }).success).toBe(false);
    expect(aiQuerySchema.safeParse({ query: 'hi', deviceId: { $ne: null } }).success).toBe(false);
  });
});

describe('device search filter', () => {
  it('escapes regex metacharacters from user input', () => {
    expect(escapeRegex('.*')).toBe('\\.\\*');
    const filter = JSON.stringify(deviceSearchFilter('(a+)+$'));
    expect(filter).toContain('\\\\(a\\\\+\\\\)\\\\+\\\\$');
  });

  it('matches model-number prefixes in upper case and codenames in lower case', () => {
    const { $or } = deviceSearchFilter('sm-g991') as { $or: Record<string, { $regex: string }>[] };
    expect($or[1].modelNumbers.$regex).toBe('^SM-G991');
    expect($or[0].codename.$regex).toBe('^sm-g991');
  });
});
