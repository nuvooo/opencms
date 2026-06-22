import { z } from 'zod';

export const MediaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  filePath: z.string(),
  altText: z.string().nullable(),
  tenantId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Media = z.infer<typeof MediaSchema>;

export const GetMediaSchema = z.object({ data: z.array(MediaSchema) });

export const GetSingleMediaSchema = z.object({ data: MediaSchema });
