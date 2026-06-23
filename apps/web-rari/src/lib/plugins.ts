import { z } from 'zod';
import { safeFetch } from './api';
import { authHeaders } from './auth-headers';
import { getSession } from './session';

export const PluginNavItemSchema = z.object({
  path: z.string(),
  label: z.string(),
  icon: z.string(),
});

export const PluginDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  icon: z.string(),
  source: z.enum(['core', 'user']),
  isSystem: z.boolean(),
  enabled: z.boolean(),
  protected: z.boolean().optional().default(false),
  navItems: z.array(PluginNavItemSchema),
});

export const MarketplaceEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  icon: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  downloadUrl: z.string(),
  installed: z.boolean(),
  installedVersion: z.string().nullable(),
});

const PluginsResponseSchema = z.object({
  data: z.array(PluginDescriptorSchema),
});
const MarketplaceResponseSchema = z.object({
  data: z.array(MarketplaceEntrySchema),
});

export type PluginDescriptor = z.infer<typeof PluginDescriptorSchema>;
export type PluginNavItem = z.infer<typeof PluginNavItemSchema>;
export type MarketplaceEntry = z.infer<typeof MarketplaceEntrySchema>;

/** Server fetcher: all plugins with their enabled/protected state. */
export async function getPlugins(): Promise<PluginDescriptor[]> {
  const session = await getSession();
  const [error, data] = await safeFetch(PluginsResponseSchema, '/plugins', {
    cache: 'no-store',
    headers: authHeaders(session),
  });
  if (error) throw new Error(error);
  return data.data;
}

/** Server fetcher: marketplace catalog decorated with install state. */
export async function getMarketplace(): Promise<MarketplaceEntry[]> {
  const session = await getSession();
  const [error, data] = await safeFetch(
    MarketplaceResponseSchema,
    '/plugins/marketplace',
    {
      cache: 'no-store',
      headers: authHeaders(session),
    },
  );
  if (error) throw new Error(error);
  return data.data;
}
