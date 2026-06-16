import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  domain: z.string().nullable(),
  locales: z.array(z.string()),
  schemaName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isTemplate: z.boolean().optional(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const GetTenantsSchema = z.object({
  data: z.array(TenantSchema),
});

export type GetTenants = z.infer<typeof GetTenantsSchema>;

export const GetTenantSchema = z.object({
  data: TenantSchema,
});

export type GetTenant = z.infer<typeof GetTenantSchema>;
