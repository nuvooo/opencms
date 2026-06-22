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

// Human-readable messages so the same constraints can be surfaced inline in the
// setup wizard (client-side) and by the server action validation.
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Add a special character');

export const BootstrapSetupInputSchema = z.object({
  app: z.object({
    allowCorsUrl: z.string().url('Enter a valid URL'),
    authSecret: z.string().min(10, 'Use at least 10 characters'),
    authUrl: z.string().url('Enter a valid URL').optional(),
  }),
  database: ValidateDbInputSchema,
  admin: z.object({
    email: z.string().email('Enter a valid email address'),
    password: passwordSchema,
  }),
});

/**
 * Client-side requiredness for the database step. `ValidateDbInputSchema` keeps
 * every field optional (the API preflight does the real connection check), so
 * this schema adds the per-engine required fields the wizard should flag inline
 * before a connection is even attempted.
 */
export const DbConnectionStepSchema = ValidateDbInputSchema.superRefine(
  (value, ctx) => {
    if (value.type === 'sqlite') {
      if (!value.database?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['database'],
          message: 'Enter a database file path',
        });
      }
      return;
    }

    const required: [keyof typeof value, string][] = [
      ['host', 'Enter a host'],
      ['username', 'Enter a username'],
      ['name', 'Enter a database name'],
    ];
    for (const [field, message] of required) {
      if (!String(value[field] ?? '').trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    }

    const port = String(value.port ?? '').trim();
    if (!port) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['port'],
        message: 'Enter a port',
      });
    } else if (!/^\d+$/.test(port)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['port'],
        message: 'Port must be a number',
      });
    }
  },
);

export type SetupStatus = z.infer<typeof SetupStatusSchema>;
