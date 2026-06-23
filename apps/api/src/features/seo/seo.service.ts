import { TenantDbService } from '@/common/services';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSeoSettingsDto } from './dto/update-seo-settings.dto';
import { SeoSettings } from './entities/seo-settings.entity';

interface SitemapRow {
  id: string;
  content_type_slug: string;
  locale: string;
  updated_at: string | Date | null;
}

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoSettings)
    private readonly settingsRepo: Repository<SeoSettings>,
    private readonly tenantDb: TenantDbService,
  ) {}

  /** Returns the tenant's settings, materialising defaults on first read. */
  async getSettings(tenantId: string): Promise<SeoSettings> {
    const existing = await this.settingsRepo.findOneBy({ tenantId });
    if (existing) {
      return existing;
    }
    return this.settingsRepo.save(this.settingsRepo.create({ tenantId }));
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateSeoSettingsDto,
  ): Promise<SeoSettings> {
    const current = await this.getSettings(tenantId);
    Object.assign(current, dto);
    return this.settingsRepo.save(current);
  }

  /** Builds the robots.txt body, falling back to a sitemap-aware default. */
  async buildRobotsTxt(tenantId: string): Promise<string> {
    const settings = await this.getSettings(tenantId);
    if (settings.robotsTxt.trim()) {
      return settings.robotsTxt;
    }

    const lines = ['User-agent: *', 'Allow: /'];
    if (settings.sitemapEnabled && settings.siteUrl) {
      lines.push('', `Sitemap: ${this.sitemapUrl(settings.siteUrl)}`);
    }
    return `${lines.join('\n')}\n`;
  }

  /** Builds an XML sitemap from the tenant's published entries. */
  async buildSitemap(tenantId: string, schemaName: string): Promise<string> {
    const settings = await this.getSettings(tenantId);
    const base = settings.siteUrl.replace(/\/+$/, '');

    const urls: { loc: string; lastmod?: string }[] = [];
    if (base) {
      urls.push({ loc: `${base}/` });
    }

    let rows: SitemapRow[] = [];
    try {
      rows = await this.tenantDb.withTenantDb<SitemapRow[]>(
        schemaName,
        (query) =>
          query(
            `SELECT id, content_type_slug, locale, updated_at FROM "entry" WHERE status = $1`,
            ['published'],
          ),
      );
    } catch {
      // A tenant without a content store yet still gets a valid sitemap.
      rows = [];
    }

    for (const row of rows) {
      const path = `/${encodeURIComponent(row.locale)}/${encodeURIComponent(
        row.content_type_slug,
      )}/${encodeURIComponent(row.id)}`;
      urls.push({
        loc: base ? `${base}${path}` : path,
        lastmod: row.updated_at
          ? new Date(row.updated_at).toISOString()
          : undefined,
      });
    }

    return this.renderSitemap(urls);
  }

  private sitemapUrl(siteUrl: string): string {
    return `${siteUrl.replace(/\/+$/, '')}/api/seo/sitemap.xml`;
  }

  private renderSitemap(urls: { loc: string; lastmod?: string }[]): string {
    const body = urls
      .map((url) => {
        const lastmod = url.lastmod
          ? `\n    <lastmod>${url.lastmod}</lastmod>`
          : '';
        return `  <url>\n    <loc>${this.escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
