export interface PluginNavItem {
  path: string;
  label: string;
  icon: string;
}

export interface PluginDescriptor {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  source: 'core' | 'user';
  isSystem: boolean;
  enabled: boolean;
  navItems: PluginNavItem[];
}
