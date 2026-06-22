import { z } from 'zod';

export const SetupStatusSchema = z.object({
  initialized: z.boolean(),
  inProgress: z.boolean(),
});

export const ValidateDbResponseSchema = z.object({
  ok: z.boolean(),
});

export const ValidateDbInputSchema = z.object({
  // Engine selection. For sqlite only `database` (file path) is required; the
  // connection fields are ignored.
  type: z.enum(['postgres', 'mysql', 'sqlite']).default('postgres'),
  host: z.string().optional(),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  name: z.string().optional(),
  database: z.string().optional(),
  ssl: z.boolean().optional(),
});

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/\d/)
  .regex(/[!@#$%^&*(),.?":{}|<>]/);

export const BootstrapSetupInputSchema = z.object({
  app: z.object({
    allowCorsUrl: z.string().url(),
    authSecret: z.string().min(10),
    authUrl: z.string().url().optional(),
  }),
  database: ValidateDbInputSchema,
  admin: z.object({
    email: z.string().email(),
    password: passwordSchema,
  }),
});

export type SetupStatus = z.infer<typeof SetupStatusSchema>;
