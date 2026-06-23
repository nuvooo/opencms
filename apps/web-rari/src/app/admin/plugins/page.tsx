import PluginsManager from '@/components/admin/plugins-manager';
import { getPlugins, type PluginDescriptor } from '@/lib/plugins';
import type { Metadata } from 'rari';

export default async function PluginsPage() {
  let initial: PluginDescriptor[] = [];
  let error: string | null = null;
  try {
    initial = await getPlugins();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load plugins';
  }

  return <PluginsManager initial={initial} loadError={error} />;
}

export const metadata: Metadata = {
  title: 'Plugins | OpenCMS',
};
