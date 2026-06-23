import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { PluginFilesService } from './plugin-files.service';
import {
  MarketplaceCatalogSchema,
  MarketplaceEntry,
} from './plugin-marketplace.types';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginDescriptor } from './plugin.registry.types';

const DEFAULT_MARKETPLACE_URL =
  'https://raw.githubusercontent.com/nuvooo/opencms-plugins/main/catalog.json';

/**
 * Backs the in-app marketplace (Admin → Marketplace).
 *
 * Reads a remote `catalog.json` (configurable via `PLUGIN_MARKETPLACE_URL`),
 * lists the available plugins decorated with the CMS's install state, and
 * installs a chosen plugin by downloading its package and handing the bytes to
 * {@link PluginFilesService}. Supports `http(s):` and `file:` catalog/package
 * locations so it works both against the published registry and a local
 * checkout during development.
 */
@Injectable()
export class PluginMarketplaceService {
  private readonly logger = new Logger(PluginMarketplaceService.name);

  constructor(
    private readonly registry: PluginRegistryService,
    private readonly files: PluginFilesService,
  ) {}

  private get catalogUrl(): string {
    return process.env.PLUGIN_MARKETPLACE_URL || DEFAULT_MARKETPLACE_URL;
  }

  /** Fetches the catalog and merges in the local install state. */
  async getMarketplace(): Promise<MarketplaceEntry[]> {
    const catalog = await this.fetchCatalog();
    const installed = new Map(
      this.registry.getAll().map((plugin) => [plugin.id, plugin]),
    );

    return catalog.plugins.map((entry) => {
      const local = installed.get(entry.id);
      return {
        ...entry,
        installed: Boolean(local),
        installedVersion: local?.version ?? null,
      };
    });
  }

  /** Downloads and installs the catalog plugin with the given id. */
  async install(id: string): Promise<PluginDescriptor[]> {
    const catalog = await this.fetchCatalog();
    const entry = catalog.plugins.find((plugin) => plugin.id === id);
    if (!entry) {
      throw new NotFoundException(
        `Plugin "${id}" is not available in the marketplace`,
      );
    }

    const downloadLocation = this.resolveDownloadLocation(
      this.catalogUrl,
      entry.downloadUrl,
    );
    const archive = await this.download(downloadLocation);
    this.files.installFromBuffer(archive);
    return this.registry.rescan();
  }

  /**
   * Resolves a catalog entry's `downloadUrl` against the catalog's own location
   * so packages can be referenced relatively (e.g. `dist/seo-1.0.0.zip`). This
   * keeps the catalog independent of the branch or host it is served from, and
   * makes local `file:` checkouts work without rewriting URLs. Absolute
   * `http(s):`/`file:`/filesystem targets are returned unchanged.
   */
  private resolveDownloadLocation(
    catalogLocation: string,
    downloadUrl: string,
  ): string {
    if (/^(https?:|file:)/.test(downloadUrl) || isAbsolute(downloadUrl)) {
      return downloadUrl;
    }
    if (/^(https?:|file:)/.test(catalogLocation)) {
      return new URL(downloadUrl, catalogLocation).toString();
    }
    return join(dirname(catalogLocation), downloadUrl);
  }

  private async fetchCatalog(): Promise<
    z.infer<typeof MarketplaceCatalogSchema>
  > {
    const url = this.catalogUrl;
    let raw: Buffer;
    try {
      raw = await this.fetchResource(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch marketplace catalog: ${message}`);
      throw new BadGatewayException('Unable to reach the plugin marketplace');
    }

    try {
      return MarketplaceCatalogSchema.parse(JSON.parse(raw.toString('utf-8')));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Malformed marketplace catalog: ${message}`);
      throw new BadGatewayException(
        'The plugin marketplace returned invalid data',
      );
    }
  }

  private async download(url: string): Promise<Buffer> {
    try {
      return await this.fetchResource(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to download plugin package: ${message}`);
      throw new BadGatewayException('Unable to download the plugin package');
    }
  }

  /** Reads a resource from a `file:`/local path or fetches it over HTTP(S). */
  private async fetchResource(location: string): Promise<Buffer> {
    if (location.startsWith('file:')) {
      return readFile(fileURLToPath(location));
    }
    if (!/^https?:\/\//.test(location)) {
      // Treat anything that is not an http(s)/file URL as a local filesystem
      // path, which keeps offline development simple.
      return readFile(location);
    }

    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${location}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
