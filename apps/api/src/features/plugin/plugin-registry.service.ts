import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginDescriptor } from './plugin.registry.types';

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private plugins = new Map<string, PluginDescriptor>();

  constructor(private readonly loader: PluginLoaderService) {}

  onModuleInit(): void {
    this.rescan();
  }

  rescan(): PluginDescriptor[] {
    const loaded = this.loader.loadAll();
    this.plugins = new Map(loaded.map((plugin) => [plugin.id, plugin]));
    return this.getAll();
  }

  getAll(): PluginDescriptor[] {
    return Array.from(this.plugins.values());
  }

  get(id: string): PluginDescriptor | undefined {
    return this.plugins.get(id);
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
