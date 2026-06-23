import { z } from 'zod';

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
  // Core features that cannot be disabled. Optional/defaulted for resilience
  // against older API responses that predate the flag.
  protected: z.boolean().optional().default(false),
  navItems: z.array(PluginNavItemSchema),
});

export const GetPluginsSchema = z.object({
  data: z.array(PluginDescriptorSchema),
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

export const GetMarketplaceSchema = z.object({
  data: z.array(MarketplaceEntrySchema),
});

export type PluginDescriptor = z.infer<typeof PluginDescriptorSchema>;
export type PluginNavItem = z.infer<typeof PluginNavItemSchema>;
export type MarketplaceEntry = z.infer<typeof MarketplaceEntrySchema>;
