'use client';

import { usePluginRegistry } from '@/lib/plugin/registry';
import { getPlugins } from '@/server/plugin.server';
import { useEffect } from 'react';

const PluginLoader = () => {
  const { setPlugins } = usePluginRegistry();

  useEffect(() => {
    getPlugins().then(setPlugins).catch(console.error);
  }, [setPlugins]);

  return null;
};

export default PluginLoader;
