import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { z } from 'zod';
const AdmZip = require('adm-zip');

const UploadManifestSchema = z.object({
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
export class PluginFilesService {
  private readonly repoRoot = this.resolveRepoRoot(process.cwd());
  private readonly userPluginsDir = this.resolveUserPluginsDir();

  installFromZip(file: MemoryStorageFile): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Invalid plugin package: file is empty');
    }

    const zip = new AdmZip(file.buffer);
    const manifestEntry = zip
      .getEntries()
      .find((entry) =>
        /(^|\/)manifest\.json$/.test(this.toPosix(entry.entryName)),
      );

    if (!manifestEntry) {
      throw new BadRequestException(
        'Invalid plugin package: manifest.json missing',
      );
    }

    const manifest = this.parseManifest(
      manifestEntry.getData().toString('utf-8'),
    );

    if (this.hasCorePluginId(manifest.id)) {
      throw new BadRequestException(
        `Invalid plugin package: plugin id "${manifest.id}" is reserved by a core plugin`,
      );
    }

    const basePrefix = this.getBasePrefix(manifestEntry.entryName);
    const targetDir = this.resolvePluginDir(manifest.id);
    const stagingDir = this.buildStagingDir(manifest.id);
    const backupDir = this.buildBackupDir(manifest.id);

    rmSync(stagingDir, { recursive: true, force: true });
    mkdirSync(stagingDir, { recursive: true });

    let targetMovedToBackup = false;
    try {
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) {
          continue;
        }

        const entryName = this.toPosix(entry.entryName);
        if (basePrefix && !entryName.startsWith(basePrefix)) {
          continue;
        }

        const relativePath = basePrefix
          ? entryName.slice(basePrefix.length)
          : entryName;

        if (!relativePath) {
          continue;
        }

        this.ensureSafeRelativePath(relativePath);

        const outPath = join(stagingDir, relativePath.replace(/\//g, sep));
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, entry.getData());
      }

      if (!existsSync(join(stagingDir, 'manifest.json'))) {
        throw new BadRequestException(
          'Invalid plugin package: root manifest missing',
        );
      }

      if (existsSync(targetDir)) {
        rmSync(backupDir, { recursive: true, force: true });
        renameSync(targetDir, backupDir);
        targetMovedToBackup = true;
      }

      renameSync(stagingDir, targetDir);

      if (targetMovedToBackup) {
        rmSync(backupDir, { recursive: true, force: true });
      }
    } catch (error) {
      if (
        targetMovedToBackup &&
        existsSync(backupDir) &&
        !existsSync(targetDir)
      ) {
        renameSync(backupDir, targetDir);
      }
      rmSync(stagingDir, { recursive: true, force: true });
      throw error;
    }

    return manifest.id;
  }

  uninstall(id: string): void {
    rmSync(this.resolvePluginDir(id), { recursive: true, force: true });
  }

  private resolveUserPluginsDir(): string {
    const preferredPath = join(this.repoRoot, 'plugins');
    if (existsSync(preferredPath)) {
      return preferredPath;
    }

    return join(this.repoRoot, 'apps/api/plugins');
  }

  private resolveCorePluginsDir(): string {
    const preferredPath = join(this.repoRoot, 'core/plugins');
    if (existsSync(preferredPath)) {
      return preferredPath;
    }

    return join(this.repoRoot, 'apps/api/core/plugins');
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

  private hasCorePluginId(id: string): boolean {
    const corePluginsDir = this.resolveCorePluginsDir();
    if (!existsSync(corePluginsDir)) {
      return false;
    }

    const entries = readdirSync(corePluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = join(corePluginsDir, entry.name, 'manifest.json');
      if (!existsSync(manifestPath)) {
        continue;
      }

      try {
        const manifest = this.parseManifest(
          readFileSync(manifestPath, 'utf-8'),
        );
        if (manifest.id === id) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  private buildStagingDir(id: string): string {
    return join(this.userPluginsDir, `.staging-${id}-${Date.now()}`);
  }

  private buildBackupDir(id: string): string {
    return join(this.userPluginsDir, `.backup-${id}-${Date.now()}`);
  }

  private getBasePrefix(entryName: string): string {
    const normalized = this.toPosix(entryName);
    const parts = normalized.split('/').filter(Boolean);

    if (parts.length <= 1) {
      return '';
    }

    return `${parts.slice(0, -1).join('/')}/`;
  }

  private ensureSafeRelativePath(relativePath: string): void {
    const posixPath = this.toPosix(relativePath);
    const normalized = normalize(posixPath.replace(/\//g, sep));

    if (posixPath.startsWith('/') || /^[a-zA-Z]:\//.test(posixPath)) {
      throw new BadRequestException('Invalid plugin package: unsafe file path');
    }

    if (
      normalized === '..' ||
      normalized.startsWith(`..${sep}`) ||
      normalized.includes(`${sep}..${sep}`) ||
      normalized.endsWith(`${sep}..`)
    ) {
      throw new BadRequestException('Invalid plugin package: unsafe file path');
    }
  }

  private parseManifest(
    manifestContent: string,
  ): z.infer<typeof UploadManifestSchema> {
    try {
      return UploadManifestSchema.parse(JSON.parse(manifestContent));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException(
          'Invalid plugin package: manifest.json is malformed',
        );
      }

      if (error instanceof z.ZodError) {
        throw new BadRequestException(
          'Invalid plugin package: manifest validation failed',
        );
      }

      throw error;
    }
  }

  private resolvePluginDir(id: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new BadRequestException('Invalid plugin id');
    }

    const pluginsRoot = resolve(this.userPluginsDir);
    const pluginDir = resolve(pluginsRoot, id);

    if (
      pluginDir !== pluginsRoot &&
      !pluginDir.startsWith(`${pluginsRoot}${sep}`)
    ) {
      throw new BadRequestException('Invalid plugin id');
    }

    return pluginDir;
  }

  private toPosix(path: string): string {
    return path.replace(/\\/g, '/');
  }
}
