import process from 'node:process';
import { z } from 'zod';

/**
 * Server-side environment. Mirrors apps/web/lib/env.ts so the rari port talks to
 * the same NestJS API. Auth is cookie-based here (no NextAuth), so only the API
 * URL and the session cookie lifetime are required.
 */
const EnvSchema = z.object({
  API_URL: z.string().url().default('http://localhost:8000/api'),
  AUTH_SESSION_AGE: z.coerce.number().default(7776000), // 3 months, in seconds
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const env = EnvSchema.parse({
  API_URL: process.env.API_URL,
  AUTH_SESSION_AGE: process.env.AUTH_SESSION_AGE,
  NODE_ENV: process.env.NODE_ENV,
});

export type Env = z.infer<typeof EnvSchema>;
