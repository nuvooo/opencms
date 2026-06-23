import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginFilesService } from './plugin-files.service';
import { PluginMarketplaceService } from './plugin-marketplace.service';

describe('PluginMarketplaceService', () => {
  const ORIGINAL_URL = process.env.PLUGIN_MARKETPLACE_URL;
  let dir: string;
  let catalogPath: string;
  let zipPath: string;

  const writeCatalog = (downloadUrl: string) => {
    writeFileSync(
      catalogPath,
      JSON.stringify({
        version: 1,
        plugins: [
          {
            id: 'seo',
            name: 'SEO',
            description: 'desc',
            version: '1.0.0',
            icon: 'Search',
            downloadUrl,
          },
        ],
      }),
    );
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mkt-'));
    catalogPath = join(dir, 'catalog.json');
    zipPath = join(dir, 'seo.zip');
    writeFileSync(zipPath, Buffer.from('zip-bytes'));
    process.env.PLUGIN_MARKETPLACE_URL = catalogPath;
  });

  afterEach(() => {
    process.env.PLUGIN_MARKETPLACE_URL = ORIGINAL_URL;
  });

  it('merges install state into the catalog', async () => {
    writeCatalog(zipPath);
    const registry = {
      getAll: jest.fn().mockReturnValue([{ id: 'seo', version: '1.0.0' }]),
    } as any;
    const service = new PluginMarketplaceService(
      registry,
      {} as PluginFilesService,
    );

    const entries = await service.getMarketplace();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'seo',
      installed: true,
      installedVersion: '1.0.0',
    });
  });

  it('reports not-installed plugins', async () => {
    writeCatalog(zipPath);
    const registry = { getAll: jest.fn().mockReturnValue([]) } as any;
    const service = new PluginMarketplaceService(
      registry,
      {} as PluginFilesService,
    );

    const [entry] = await service.getMarketplace();
    expect(entry.installed).toBe(false);
    expect(entry.installedVersion).toBeNull();
  });

  it('downloads the package and installs it', async () => {
    writeCatalog(zipPath);
    const installFromBuffer = jest.fn().mockReturnValue('seo');
    const rescan = jest.fn().mockReturnValue([{ id: 'seo' }]);
    const service = new PluginMarketplaceService(
      { rescan } as any,
      { installFromBuffer } as any,
    );

    const result = await service.install('seo');
    expect(installFromBuffer).toHaveBeenCalledWith(Buffer.from('zip-bytes'));
    expect(rescan).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 'seo' }]);
  });

  it('rejects an unknown plugin id', async () => {
    writeCatalog(zipPath);
    const service = new PluginMarketplaceService(
      { getAll: jest.fn() } as any,
      {} as any,
    );
    await expect(service.install('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('surfaces an unreachable catalog as a bad gateway', async () => {
    process.env.PLUGIN_MARKETPLACE_URL = join(dir, 'missing.json');
    const service = new PluginMarketplaceService(
      { getAll: jest.fn() } as any,
      {} as any,
    );
    await expect(service.getMarketplace()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
