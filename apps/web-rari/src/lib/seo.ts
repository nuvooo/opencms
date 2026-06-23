import { z } from 'zod';

export const SeoSettingsSchema = z.object({
  tenantId: z.string(),
  siteUrl: z.string(),
  siteName: z.string(),
  titleTemplate: z.string(),
  defaultDescription: z.string(),
  robotsTxt: z.string(),
  sitemapEnabled: z.boolean(),
  ogImageUrl: z.string(),
  twitterHandle: z.string(),
  updatedAt: z.coerce.date().optional(),
});

export const SeoSettingsResponseSchema = z.object({ data: SeoSettingsSchema });

export type SeoSettings = z.infer<typeof SeoSettingsSchema>;

export type SeoSettingsInput = Partial<
  Pick<
    SeoSettings,
    | 'siteUrl'
    | 'siteName'
    | 'titleTemplate'
    | 'defaultDescription'
    | 'robotsTxt'
    | 'sitemapEnabled'
    | 'ogImageUrl'
    | 'twitterHandle'
  >
>;
