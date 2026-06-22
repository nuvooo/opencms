import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginLoaderService } from './plugin-loader.service';

describe('PluginLoaderService', () => {
  const createManifest = (manifest: {
    id: string;
    name: string;
    description: string;
    version: string;
    icon: string;
    navItems: Array<{ path: string; label: string; icon: string }>;
  }) => JSON.stringify(manifest);

  it('loads core and user manifests and tags source', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));

    try {
      mkdirSync(join(root, 'apps/api/core/plugins/dashboard'), {
        recursive: true,
      });
      mkdirSync(join(root, 'apps/api/plugins/seo-tools'), {
        recursive: true,
      });

      writeFileSync(
        join(root, 'apps/api/core/plugins/dashboard/manifest.json'),
        createManifest({
          id: 'dashboard',
          name: 'Dashboard',
          description: 'Core dashboard',
          version: '1.0.0',
          icon: 'LayoutDashboard',
          navItems: [
            { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
          ],
        }),
      );

      writeFileSync(
        join(root, 'apps/api/plugins/seo-tools/manifest.json'),
        createManifest({
          id: 'seo-tools',
          name: 'SEO Tools',
          description: 'User plugin',
          version: '0.1.0',
          icon: 'WandSparkles',
          navItems: [
            { path: '/admin/seo', label: 'SEO', icon: 'WandSparkles' },
          ],
        }),
      );

      const loader = new PluginLoaderService(root);
      const plugins = loader.loadAll();

      expect(plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'dashboard',
            source: 'core',
            isSystem: true,
            enabled: true,
          }),
          expect.objectContaining({
            id: 'seo-tools',
            source: 'user',
            isSystem: false,
            enabled: true,
          }),
        ]),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignores user plugin ids that collide with core plugins', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));

    try {
      mkdirSync(join(root, 'apps/api/core/plugins/media'), { recursive: true });
      mkdirSync(join(root, 'apps/api/plugins/media'), { recursive: true });

      const manifest = createManifest({
        id: 'media',
        name: 'Media',
        description: 'Media plugin',
        version: '1.0.0',
        icon: 'ImageIcon',
        navItems: [{ path: '/admin/media', label: 'Media', icon: 'ImageIcon' }],
      });

      writeFileSync(
        join(root, 'apps/api/core/plugins/media/manifest.json'),
        manifest,
      );
      writeFileSync(
        join(root, 'apps/api/plugins/media/manifest.json'),
        manifest,
      );

      const loader = new PluginLoaderService(root);
      const plugins = loader.loadAll();

      expect(plugins.filter((plugin) => plugin.id === 'media')).toHaveLength(1);
      expect(plugins.find((plugin) => plugin.id === 'media')?.source).toBe(
        'core',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('resolves default plugin paths when rootDir is apps/api', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));
    const apiRoot = join(root, 'apps/api');

    try {
      mkdirSync(join(root, 'apps/api/core/plugins/dashboard'), {
        recursive: true,
      });
      mkdirSync(join(root, 'apps/api/plugins/seo-tools'), {
        recursive: true,
      });

      writeFileSync(
        join(root, 'apps/api/core/plugins/dashboard/manifest.json'),
        createManifest({
          id: 'dashboard',
          name: 'Dashboard',
          description: 'Core dashboard',
          version: '1.0.0',
          icon: 'LayoutDashboard',
          navItems: [
            { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
          ],
        }),
      );

      writeFileSync(
        join(root, 'apps/api/plugins/seo-tools/manifest.json'),
        createManifest({
          id: 'seo-tools',
          name: 'SEO Tools',
          description: 'User plugin',
          version: '0.1.0',
          icon: 'WandSparkles',
          navItems: [
            { path: '/admin/seo', label: 'SEO', icon: 'WandSparkles' },
          ],
        }),
      );

      const loader = new PluginLoaderService(apiRoot);
      const plugins = loader.loadAll();

      expect(plugins.map((plugin) => plugin.id).sort()).toEqual([
        'dashboard',
        'seo-tools',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips malformed manifests with warning and continues loading', () => {
    const root = mkdtempSync(join(tmpdir(), 'plugin-loader-'));

    try {
      mkdirSync(join(root, 'apps/api/core/plugins/dashboard'), {
        recursive: true,
      });
      mkdirSync(join(root, 'apps/api/plugins/broken-plugin'), {
        recursive: true,
      });
      mkdirSync(join(root, 'apps/api/plugins/seo-tools'), {
        recursive: true,
      });

      writeFileSync(
        join(root, 'apps/api/core/plugins/dashboard/manifest.json'),
        createManifest({
          id: 'dashboard',
          name: 'Dashboard',
          description: 'Core dashboard',
          version: '1.0.0',
          icon: 'LayoutDashboard',
          navItems: [
            { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
          ],
        }),
      );

      writeFileSync(
        join(root, 'apps/api/plugins/broken-plugin/manifest.json'),
        '{ this is not valid json',
      );

      writeFileSync(
        join(root, 'apps/api/plugins/seo-tools/manifest.json'),
        createManifest({
          id: 'seo-tools',
          name: 'SEO Tools',
          description: 'User plugin',
          version: '0.1.0',
          icon: 'WandSparkles',
          navItems: [
            { path: '/admin/seo', label: 'SEO', icon: 'WandSparkles' },
          ],
        }),
      );

      const loader = new PluginLoaderService(root);
      const warnSpy = jest.spyOn(loader['logger'], 'warn').mockImplementation();
      const plugins = loader.loadAll();

      expect(plugins.map((plugin) => plugin.id).sort()).toEqual([
        'dashboard',
        'seo-tools',
      ]);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
