import { z } from 'zod';

/**
 * A single plugin entry in the remote marketplace catalog (`catalog.json`).
 * Only `downloadUrl` is consumed server-side; the rest is metadata for the UI.
 */
export const MarketplaceCatalogEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  icon: z.string().min(1),
  author: z.string().optional(),
  homepage: z.string().optional(),
  downloadUrl: z.string().min(1),
});

export const MarketplaceCatalogSchema = z.object({
  version: z.number().optional(),
  name: z.string().optional(),
  plugins: z.array(MarketplaceCatalogEntrySchema),
});

export type MarketplaceCatalogEntry = z.infer<
  typeof MarketplaceCatalogEntrySchema
>;

/** A catalog entry decorated with the install state of the running CMS. */
export interface MarketplaceEntry extends MarketplaceCatalogEntry {
  installed: boolean;
  installedVersion: string | null;
}
