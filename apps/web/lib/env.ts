import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // These defaults let the app boot on a fresh install (no .env yet) so the
    // user can reach the /setup wizard, which then persists the real values.
    API_URL: z.string().url().default('http://localhost:8000/api'),
    AUTH_SESSION_AGE: z.coerce.number().default(7776000), // 3 months
    AUTH_SECRET: z.string().min(1).default('dev-insecure-setup-secret'),
    NODE_ENV: z.string().default('development'),
    AUTH_URL: z.string().url().default('http://localhost:3000'),
  },
  client: {},
  runtimeEnv: {
    API_URL: process.env.API_URL,
    AUTH_SESSION_AGE: process.env.AUTH_SESSION_AGE,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_URL: process.env.AUTH_URL,
  },
});
