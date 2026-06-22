import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { BadRequestException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginFilesService } from './plugin-files.service';
const AdmZip = require('adm-zip');

describe('PluginFilesService', () => {
  let service: PluginFilesService;
  let testPluginsDir: string;

  beforeEach(() => {
    service = new PluginFilesService();
    testPluginsDir = mkdtempSync(join(tmpdir(), 'plugin-files-service-'));
    (service as unknown as { userPluginsDir: string }).userPluginsDir =
      testPluginsDir;
  });

  afterEach(() => {
    rmSync(testPluginsDir, { recursive: true, force: true });
  });

  it('rejects plugin manifests with unsafe id values', () => {
    const file = buildZip({
      manifest: {
        id: '../escape',
      },
      entries: [],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
  });

  it('rejects rooted paths in zip entries', () => {
    const file = buildZip({
      manifest: {
        id: 'safe-plugin',
      },
      entries: [{ path: 'plugin/C:/outside.txt', content: 'x' }],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
  });

  it('converts invalid manifest validation errors to bad request', () => {
    const file = buildZip({
      manifest: {
        id: '',
      },
      entries: [],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
  });

  it('converts malformed manifest JSON errors to bad request', () => {
    const file = buildZip({
      manifestRaw: '{"id":"plugin-id",',
      entries: [],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
  });

  it('accepts manifest.json at zip root', () => {
    const file = buildZip({
      manifestPath: 'manifest.json',
      manifest: {
        id: 'root-manifest-plugin',
      },
      entries: [{ path: 'index.js', content: 'export default {}' }],
    });

    expect(service.installFromZip(file)).toBe('root-manifest-plugin');
  });

  it('rejects install when plugin id collides with core plugin id', () => {
    const corePluginsDir = join(testPluginsDir, 'core/plugins');
    mkdirSync(join(corePluginsDir, 'dashboard'), { recursive: true });
    writeFileSync(
      join(corePluginsDir, 'dashboard/manifest.json'),
      JSON.stringify({
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core dashboard',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [
          {
            path: '/admin',
            label: 'Dashboard',
            icon: 'LayoutDashboard',
          },
        ],
      }),
      'utf-8',
    );

    (
      service as unknown as { resolveCorePluginsDir: () => string }
    ).resolveCorePluginsDir = () => corePluginsDir;

    const file = buildZip({
      manifest: {
        id: 'dashboard',
      },
      entries: [{ path: 'plugin/index.js', content: 'export default {}' }],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
    expect(existsSync(join(testPluginsDir, 'dashboard'))).toBe(false);
  });

  it('does not destroy existing plugin when install fails', () => {
    const pluginDir = join(testPluginsDir, 'seo-tools');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, 'manifest.json'),
      JSON.stringify({
        id: 'seo-tools',
        name: 'Old Plugin',
        description: 'Old plugin description',
        version: '1.0.0',
        icon: 'icon-home',
        navItems: [
          {
            path: '/plugin',
            label: 'Plugin',
            icon: 'icon-home',
          },
        ],
      }),
      'utf-8',
    );
    writeFileSync(join(pluginDir, 'existing.txt'), 'existing-content', 'utf-8');

    const file = buildZip({
      manifest: {
        id: 'seo-tools',
      },
      entries: [{ path: 'plugin/C:/outside.txt', content: 'boom' }],
    });

    expect(() => service.installFromZip(file)).toThrow(BadRequestException);
    expect(existsSync(join(pluginDir, 'manifest.json'))).toBe(true);
    expect(readFileSync(join(pluginDir, 'existing.txt'), 'utf-8')).toBe(
      'existing-content',
    );
  });
});

function buildZip(input: {
  manifestPath?: string;
  manifestRaw?: string;
  manifest?: Partial<{
    id: string;
    name: string;
    description: string;
    version: string;
    icon: string;
  }>;
  entries: Array<{ path: string; content: string }>;
}): MemoryStorageFile {
  const zip = new AdmZip();
  const manifest = {
    id: 'plugin-id',
    name: 'Plugin',
    description: 'Plugin description',
    version: '1.0.0',
    icon: 'icon-home',
    navItems: [
      {
        path: '/plugin',
        label: 'Plugin',
        icon: 'icon-home',
      },
    ],
    ...input.manifest,
  };

  zip.addFile(
    input.manifestPath ?? 'plugin/manifest.json',
    Buffer.from(input.manifestRaw ?? JSON.stringify(manifest), 'utf-8'),
  );

  for (const entry of input.entries) {
    zip.addFile(entry.path, Buffer.from(entry.content, 'utf-8'));
  }

  return {
    buffer: zip.toBuffer(),
  } as MemoryStorageFile;
}
