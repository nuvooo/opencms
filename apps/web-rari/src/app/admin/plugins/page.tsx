import PluginsManager from '@/components/admin/plugins-manager';
import type { Metadata } from 'rari';

export default function PluginsPage() {
  return <PluginsManager />;
}

export const metadata: Metadata = {
  title: 'Plugins | OpenCMS',
};
