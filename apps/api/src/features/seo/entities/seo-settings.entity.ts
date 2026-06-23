import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Site-wide SEO configuration, one row per tenant.
 *
 * Stored in the shared `public` schema (like `plugin_state`) and keyed by the
 * tenant id, so each tenant gets its own sitemap base URL, robots.txt and meta
 * defaults. Absence of a row means "defaults" — the service materialises one on
 * first read.
 */
@Entity({ schema: 'public', name: 'seo_settings' })
export class SeoSettings {
  @PrimaryColumn({ name: 'tenant_id', type: 'varchar', length: 100 })
  tenantId: string;

  /** Canonical base URL, e.g. `https://example.com` (no trailing slash). */
  @Column({ name: 'site_url', type: 'varchar', length: 2048, default: '' })
  siteUrl: string;

  @Column({ name: 'site_name', type: 'varchar', length: 255, default: '' })
  siteName: string;

  /** Title pattern; `%s` is replaced by the page title. */
  @Column({
    name: 'title_template',
    type: 'varchar',
    length: 255,
    default: '%s',
  })
  titleTemplate: string;

  @Column({ name: 'default_description', type: 'text', default: '' })
  defaultDescription: string;

  /** Raw robots.txt body. Empty means "use the generated default". */
  @Column({ name: 'robots_txt', type: 'text', default: '' })
  robotsTxt: string;

  @Column({ name: 'sitemap_enabled', type: 'boolean', default: true })
  sitemapEnabled: boolean;

  @Column({ name: 'og_image_url', type: 'varchar', length: 2048, default: '' })
  ogImageUrl: string;

  @Column({ name: 'twitter_handle', type: 'varchar', length: 255, default: '' })
  twitterHandle: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
