export type PluginSource = 'core' | 'user';

export interface PluginNavItem {
  path: string;
  label: string;
  icon: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  navItems: PluginNavItem[];
}

export interface PluginDescriptor extends PluginManifest {
  source: PluginSource;
  isSystem: boolean;
  enabled: boolean;
  /**
   * Protected plugins are core features the CMS cannot run without. They can
   * never be disabled and are always reported as enabled.
   */
  protected: boolean;
}
