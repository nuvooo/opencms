import { SeoSettings } from './entities/seo-settings.entity';
import { SeoService } from './seo.service';

const makeSettings = (overrides: Partial<SeoSettings> = {}): SeoSettings =>
  ({
    tenantId: 't1',
    siteUrl: '',
    siteName: '',
    titleTemplate: '%s',
    defaultDescription: '',
    robotsTxt: '',
    sitemapEnabled: true,
    ogImageUrl: '',
    twitterHandle: '',
    updatedAt: new Date(),
    ...overrides,
  }) as SeoSettings;

describe('SeoService', () => {
  const buildRepo = (initial: SeoSettings | null) => {
    let stored = initial;
    return {
      findOneBy: jest.fn(async () => stored),
      create: jest.fn((value: Partial<SeoSettings>) => makeSettings(value)),
      save: jest.fn(async (value: SeoSettings) => {
        stored = value;
        return value;
      }),
    };
  };

  const tenantDb = (rows: unknown[]) => ({
    withTenantDb: jest.fn(async (_schema: string, fn: any) =>
      fn(async () => rows),
    ),
  });

  it('materialises default settings on first read', async () => {
    const repo = buildRepo(null);
    const service = new SeoService(repo as any, tenantDb([]) as any);

    const settings = await service.getSettings('t1');
    expect(settings.tenantId).toBe('t1');
    expect(settings.titleTemplate).toBe('%s');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('merges updates into existing settings', async () => {
    const repo = buildRepo(makeSettings());
    const service = new SeoService(repo as any, tenantDb([]) as any);

    const updated = await service.updateSettings('t1', {
      siteUrl: 'https://example.com',
    });
    expect(updated.siteUrl).toBe('https://example.com');
  });

  it('generates a default robots.txt that points at the sitemap', async () => {
    const repo = buildRepo(
      makeSettings({ siteUrl: 'https://example.com', sitemapEnabled: true }),
    );
    const service = new SeoService(repo as any, tenantDb([]) as any);

    const robots = await service.buildRobotsTxt('t1');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain(
      'Sitemap: https://example.com/api/seo/sitemap.xml',
    );
  });

  it('returns a custom robots.txt verbatim', async () => {
    const repo = buildRepo(makeSettings({ robotsTxt: 'User-agent: x' }));
    const service = new SeoService(repo as any, tenantDb([]) as any);

    expect(await service.buildRobotsTxt('t1')).toBe('User-agent: x');
  });

  it('builds a sitemap from published entries', async () => {
    const repo = buildRepo(makeSettings({ siteUrl: 'https://example.com' }));
    const rows = [
      {
        id: 'abc',
        content_type_slug: 'post',
        locale: 'en',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    const service = new SeoService(repo as any, tenantDb(rows) as any);

    const xml = await service.buildSitemap('t1', 'tenant_acme');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/en/post/abc</loc>');
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('still produces a valid sitemap when the entry store is missing', async () => {
    const repo = buildRepo(makeSettings({ siteUrl: 'https://example.com' }));
    const failingDb = {
      withTenantDb: jest.fn(async () => {
        throw new Error('no table');
      }),
    };
    const service = new SeoService(repo as any, failingDb as any);

    const xml = await service.buildSitemap('t1', 'tenant_acme');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>https://example.com/</loc>');
  });
});
