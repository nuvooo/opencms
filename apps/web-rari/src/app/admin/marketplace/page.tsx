import MarketplaceManager from '@/components/admin/marketplace-manager';
import type { Metadata } from 'rari';

export default function MarketplacePage() {
  return <MarketplaceManager />;
}

export const metadata: Metadata = {
  title: 'Marketplace | OpenCMS',
};
