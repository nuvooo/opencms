import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PluginRegistryService } from './plugin-registry.service';
import { REQUIRES_PLUGIN_KEY } from './requires-plugin.decorator';

/**
 * Blocks requests to a feature plugin's routes while that plugin is disabled.
 *
 * Routes opt in via `@RequiresPlugin('<id>')`; unmarked routes always pass.
 * Recovery is always possible because the plugin manager itself is never gated.
 */
@Injectable()
export class PluginEnabledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: PluginRegistryService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const pluginId = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRES_PLUGIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!pluginId) {
      return true;
    }

    const plugin = this.registry.get(pluginId);
    if (plugin && !plugin.enabled) {
      throw new ForbiddenException(`The "${pluginId}" feature is disabled`);
    }
    return true;
  }
}
