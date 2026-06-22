import { z } from 'zod';

export const SetupStatusSchema = z.object({
  initialized: z.boolean(),
  inProgress: z.boolean(),
});

export const ValidateDbResponseSchema = z.object({
  ok: z.boolean(),
});

export const ValidateDbInputSchema = z.object({
  host: z.string().min(1),
  port: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  ssl: z.boolean(),
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
