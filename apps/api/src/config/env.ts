import 'dotenv/config';
import { z } from 'zod';

const DEV_ACCESS_SECRET = 'dev-secret-change-me-in-production-min32chars!';
const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-in-prod-min32!';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Local-only default. Production must provide its own (checked below); never commit real credentials.
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/romatlas'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32).default(DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().min(32).default(DEV_REFRESH_SECRET),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  // 'none' is required when the frontend and API are on different sites (e.g. two *.onrender.com services).
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SYNC_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SYNC_INTERVAL_HOURS: z.coerce.number().positive().default(24),
  SYNC_CACHE_DIR: z.string().default('.cache'),
  GOOGLE_DEVICES_URL: z.string().url().default('https://storage.googleapis.com/play_public/supported_devices.csv'),
  LINEAGE_WIKI_REPO: z.string().url().default('https://github.com/LineageOS/lineage_wiki.git'),
  GITHUB_TOKEN: z.string().optional(),
  NIM_API_KEY: z.string().optional(),
  NIM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NIM_MODEL: z.string().default('nvidia/llama-3.1-nemotron-70b-instruct'),
});

export const env = schema.parse(process.env);

if (env.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set in production');
  if (
    env.JWT_SECRET === DEV_ACCESS_SECRET ||
    env.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET ||
    env.JWT_SECRET === env.JWT_REFRESH_SECRET
  ) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set to distinct, non-default values in production');
  }
}
