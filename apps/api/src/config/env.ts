import 'dotenv/config';
import { z } from 'zod';

const DEV_ACCESS_SECRET = 'dev-secret-change-me-in-production-min32chars!';
const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-in-prod-min32!';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/romatlas'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32).default(DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().min(32).default(DEV_REFRESH_SECRET),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  NIM_API_KEY: z.string().optional(),
  NIM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NIM_MODEL: z.string().default('nvidia/llama-3.1-nemotron-70b-instruct'),
});

export const env = schema.parse(process.env);

// The dev defaults above exist only so local development works with zero setup.
if (
  env.NODE_ENV === 'production' &&
  (env.JWT_SECRET === DEV_ACCESS_SECRET ||
    env.JWT_REFRESH_SECRET === DEV_REFRESH_SECRET ||
    env.JWT_SECRET === env.JWT_REFRESH_SECRET)
) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set to distinct, non-default values in production');
}
