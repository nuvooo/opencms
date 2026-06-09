import { z } from 'zod';

export const fieldTypes = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'boolean',
  'date',
  'image',
  'select',
  'repeater',
  'slug',
  'color',
  'json',
  'datetime',
  'time',
  'email',
  'url',
  'phone',
  'm2o',
  'o2m',
  'm2m',
] as const;

export const FieldOptionsSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  defaultValue: z.unknown().optional(),
  slugFrom: z.string().optional(),
  relatedType: z.string().optional(),
  displayField: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  choices: z.array(z.string()).optional(),
});

export const ContentTypeFieldSchema = z.object({
  name: z.string(),
  type: z.enum(fieldTypes),
  label: z.string().optional(),
  options: FieldOptionsSchema.optional(),
});

export const ContentTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  fields: z.array(ContentTypeFieldSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContentType = z.infer<typeof ContentTypeSchema>;
export type ContentTypeField = z.infer<typeof ContentTypeFieldSchema>;
export type ContentTypeFieldOptions = z.infer<typeof FieldOptionsSchema>;

export const GetContentTypesSchema = z.object({
  data: z.array(ContentTypeSchema),
});
export const GetContentTypeSchema = z.object({ data: ContentTypeSchema });
