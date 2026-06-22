'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { PluginDescriptor, PluginNavItem } from './types';

const defaultPlugins: PluginDescriptor[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'CMS overview and statistics.',
    version: '1.0.0',
    icon: 'LayoutDashboard',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [{ path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' }],
  },
  {
    id: 'entries',
    name: 'Entries',
    description: 'Manage content entries.',
    version: '1.0.0',
    icon: 'FileText',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [{ path: '/admin/entries', label: 'Entries', icon: 'FileText' }],
  },
  {
    id: 'content-types',
    name: 'Content Types',
    description: 'Define content schemas.',
    version: '1.0.0',
    icon: 'FileType',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [
      {
        path: '/admin/content-types',
        label: 'Content Types',
        icon: 'FileType',
      },
    ],
  },
  {
    id: 'media',
    name: 'Media',
    description: 'Upload and manage media files.',
    version: '1.0.0',
    icon: 'ImageIcon',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [{ path: '/admin/media', label: 'Media', icon: 'ImageIcon' }],
  },
  {
    id: 'locales',
    name: 'Locales',
    description: 'Manage languages.',
    version: '1.0.0',
    icon: 'Languages',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [{ path: '/admin/locales', label: 'Locales', icon: 'Languages' }],
  },
  {
    id: 'tenants',
    name: 'Tenants',
    description: 'Manage multi-tenant environments.',
    version: '1.0.0',
    icon: 'Building2',
    source: 'core',
    isSystem: false,
    enabled: true,
    navItems: [{ path: '/admin/tenants', label: 'Tenants', icon: 'Building2' }],
  },
  {
    id: 'plugins',
    name: 'Plugins',
    description: 'Manage system plugins.',
    version: '1.0.0',
    icon: 'Puzzle',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [{ path: '/admin/plugins', label: 'Plugins', icon: 'Puzzle' }],
  },
  {
    id: 'api-tokens',
    name: 'API Tokens',
    description: 'Manage API tokens for programmatic access.',
    version: '1.0.0',
    icon: 'KeyRound',
    source: 'core',
    isSystem: true,
    enabled: true,
    navItems: [
      { path: '/admin/api-tokens', label: 'API Tokens', icon: 'KeyRound' },
    ],
  },
];

interface PluginRegistryContextValue {
  plugins: PluginDescriptor[];
  navItems: PluginNavItem[];
  registerPlugin: (plugin: PluginDescriptor) => void;
  setPlugins: (plugins: PluginDescriptor[]) => void;
}

const PluginRegistryContext = createContext<PluginRegistryContextValue | null>(
  null,
);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [plugins, setPluginsState] =
    useState<PluginDescriptor[]>(defaultPlugins);

  const registerPlugin = useCallback((plugin: PluginDescriptor) => {
    setPluginsState((prev) => {
      if (prev.some((p) => p.id === plugin.id)) return prev;
      return [...prev, plugin];
    });
  }, []);

  const setPlugins = useCallback((newPlugins: PluginDescriptor[]) => {
    setPluginsState(newPlugins);
  }, []);

  const navItems: PluginNavItem[] = plugins.flatMap((p) =>
    p.enabled ? p.navItems : [],
  );

  return (
    <PluginRegistryContext.Provider
      value={{ plugins, navItems, registerPlugin, setPlugins }}
    >
      {children}
    </PluginRegistryContext.Provider>
  );
};

export const usePluginRegistry = (): PluginRegistryContextValue => {
  const ctx = useContext(PluginRegistryContext);
  if (!ctx)
    throw new Error('usePluginRegistry must be used within PluginProvider');
  return ctx;
};
