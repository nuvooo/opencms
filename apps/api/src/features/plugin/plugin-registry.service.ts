import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PluginState } from './entities/plugin-state.entity';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginDescriptor } from './plugin.registry.types';

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private plugins = new Map<string, PluginDescriptor>();
  private enabledStates = new Map<string, boolean>();

  /**
   * Core features the CMS cannot run without. They can never be disabled so an
   * admin can always recover and the content layer stays functional. Optional
   * core features (e.g. multi-tenancy) are intentionally excluded so they
   * remain toggleable.
   */
  private static readonly PROTECTED = new Set([
    'plugins',
    'dashboard',
    'entries',
    'locales',
    'media',
    'content-types',
    'api-tokens',
  ]);

  constructor(
    private readonly loader: PluginLoaderService,
    @InjectRepository(PluginState)
    private readonly stateRepo: Repository<PluginState>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadStates();
    this.rescan();
  }

  private async loadStates(): Promise<void> {
    const rows = await this.stateRepo.find();
    this.enabledStates = new Map(rows.map((r) => [r.pluginId, r.enabled]));
  }

  rescan(): PluginDescriptor[] {
    const loaded = this.loader.loadAll();
    this.plugins = new Map(
      loaded.map((plugin) => {
        const isProtected = this.isProtected(plugin.id);
        return [
          plugin.id,
          {
            ...plugin,
            // Protected plugins are always enabled, even if a stale persisted
            // state says otherwise.
            enabled: isProtected
              ? true
              : (this.enabledStates.get(plugin.id) ?? true),
            protected: isProtected,
          },
        ];
      }),
    );
    return this.getAll();
  }

  getAll(): PluginDescriptor[] {
    return Array.from(this.plugins.values());
  }

  get(id: string): PluginDescriptor | undefined {
    return this.plugins.get(id);
  }

  isProtected(id: string): boolean {
    return PluginRegistryService.PROTECTED.has(id);
  }

  async setEnabled(id: string, enabled: boolean): Promise<PluginDescriptor> {
    const plugin = this.get(id);
    if (!plugin) {
      throw new BadRequestException('Plugin not found');
    }
    if (!enabled && this.isProtected(id)) {
      throw new ForbiddenException(`The "${id}" plugin cannot be disabled`);
    }

    await this.stateRepo.save({ pluginId: id, enabled });
    this.enabledStates.set(id, enabled);
    plugin.enabled = enabled;
    this.plugins.set(id, plugin);
    return plugin;
  }

  assertRemovable(id: string): PluginDescriptor {
    const plugin = this.get(id);
    if (!plugin) {
      throw new BadRequestException('Plugin not found');
    }
    if (plugin.source === 'core') {
      throw new ForbiddenException('System plugins cannot be deleted');
    }
    return plugin;
  }
}
