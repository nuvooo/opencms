import { z } from 'zod';

export const EntrySchema = z.object({
  id: z.string(),
  content_type_slug: z.string(),
  fields: z.record(z.any()),
  locale: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  locale_group_id: z.string().nullable().optional(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Entry = z.infer<typeof EntrySchema>;

export const GetEntriesSchema = z.object({ data: z.array(EntrySchema) });
export const GetEntrySchema = z.object({ data: EntrySchema });
