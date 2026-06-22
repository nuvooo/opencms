import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  PluginDescriptor,
  PluginManifest,
  PluginSource,
} from './plugin.registry.types';

const PluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  icon: z.string().min(1),
  navItems: z.array(
    z.object({
      path: z.string().min(1),
      label: z.string().min(1),
      icon: z.string().min(1),
    }),
  ),
});

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);

  constructor(private readonly rootDir: string = process.cwd()) {}

  loadAll(): PluginDescriptor[] {
    const corePlugins = this.loadFromSource(
      'core',
      this.resolvePluginsPath('core'),
    );
    const coreIds = new Set(corePlugins.map((plugin) => plugin.id));

    const userPlugins = this.loadFromSource(
      'user',
      this.resolvePluginsPath('user'),
    ).filter((plugin) => {
      if (!coreIds.has(plugin.id)) {
        return true;
      }

      this.logger.warn(
        `Ignoring user plugin with reserved core id: ${plugin.id}`,
      );
      return false;
    });

    return [...corePlugins, ...userPlugins];
  }

  private loadFromSource(
    source: PluginSource,
    basePath: string,
  ): PluginDescriptor[] {
    if (!existsSync(basePath)) {
      return [];
    }

    return readdirSync(basePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(basePath, entry.name, 'manifest.json'))
      .filter((manifestPath) => existsSync(manifestPath))
      .map((manifestPath) => this.readManifest(manifestPath, source))
      .filter((plugin): plugin is PluginDescriptor => plugin !== null);
  }

  private resolvePluginsPath(source: PluginSource): string {
    const repoRoot = this.resolveRepoRoot(this.rootDir);
    const preferredPath =
      source === 'core'
        ? join(repoRoot, 'core/plugins')
        : join(repoRoot, 'plugins');
    const legacyPath =
      source === 'core'
        ? join(repoRoot, 'apps/api/core/plugins')
        : join(repoRoot, 'apps/api/plugins');

    if (existsSync(preferredPath)) {
      return preferredPath;
    }

    return legacyPath;
  }

  private resolveRepoRoot(baseDir: string): string {
    const candidates = [
      baseDir,
      resolve(baseDir, '..'),
      resolve(baseDir, '../..'),
    ];

    const matched = candidates.find((candidate) =>
      existsSync(join(candidate, 'apps/api')),
    );

    return matched ?? baseDir;
  }

  private readManifest(
    manifestPath: string,
    source: PluginSource,
  ): PluginDescriptor | null {
    try {
      const rawManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const manifest: PluginManifest = PluginManifestSchema.parse(rawManifest);

      return {
        ...manifest,
        source,
        isSystem: source === 'core',
        enabled: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Skipping invalid plugin manifest at ${manifestPath}: ${message}`,
      );
      return null;
    }
  }
}
