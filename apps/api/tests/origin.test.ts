import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireTrustedOrigin } from '../src/middleware/trustedOrigin';
import { errorHandler } from '../src/middleware/errorHandler';

describe('trusted origin guard', () => {
  const app = express();
  app.post('/refresh', requireTrustedOrigin, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  it('allows the configured frontend origin and non-browser clients', async () => {
    expect((await request(app).post('/refresh').set('Origin', 'http://localhost:5173')).status).toBe(200);
    expect((await request(app).post('/refresh')).status).toBe(200);
  });

  it('rejects a foreign origin', async () => {
    const res = await request(app).post('/refresh').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });
});
