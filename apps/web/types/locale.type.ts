import { z } from 'zod';

export const LocaleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type Locale = z.infer<typeof LocaleSchema>;

export const GetLocalesSchema = z.object({
  data: z.array(LocaleSchema),
});

export const GetLocaleSchema = z.object({
  data: LocaleSchema,
});

export const CreateLocaleSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  is_default: z.boolean().optional().default(false),
});

export const UpdateLocaleSchema = CreateLocaleSchema.partial();
