import { z } from 'zod';

/**
 * Zod schema for validating and typing environment variables.
 */
export const EnvSchema = z.object({
  HOST: z.string().default('localhost'),
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: z.coerce.number().default(8000),
  ALLOW_CORS_URL: z.string().url().default('http://localhost:3000'),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(10)
    .max(128)
    .default('access-secret-12345'),
  ACCESS_TOKEN_EXPIRATION: z.string().min(1).max(60).default('15m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(10)
    .max(128)
    .default('refresh-secret-12345'),
  REFRESH_TOKEN_EXPIRATION: z.string().min(1).max(365).default('7d'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432'),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('password'),
  DB_NAME: z.string().default('cms'),
  DB_SSL: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_IGNORE_TLS: z
    .string()
    .transform((value) => value === 'true')
    .optional(),
  MAIL_USERNAME: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  FILE_SYSTEM: z.enum(['s3', 'public']).default('public'),
  FILE_MAX_SIZE: z.coerce.number().default(20971520),
  AWS_REGION: z.string().default(''),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET_NAME: z.string().default(''),
  AWS_S3_ENDPOINT: z.string().default(''),
});

/**
 * Type representing validated environment variables.
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates a configuration object against the environment schema.
 *
 * @param {Record<string, unknown>} config - The configuration object to validate.
 * @returns {Env} The validated and typed environment variables.
 * @throws {Error} If validation fails.
 */
export const validateEnv = (config: Record<string, unknown>): Env => {
  const validate = EnvSchema.safeParse(config);
  if (!validate.success) {
    throw new Error(validate.error.message);
  }
  return validate.data;
};
