import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PLUGIN_KEY = 'requires_plugin';

/**
 * Marks a controller/handler as belonging to a feature plugin. When that plugin
 * is disabled, {@link PluginEnabledGuard} blocks the route.
 */
export const RequiresPlugin = (pluginId: string) =>
  SetMetadata(REQUIRES_PLUGIN_KEY, pluginId);
