import MarketplaceManager from '@/components/admin/marketplace-manager';
import { getMarketplace, type MarketplaceEntry } from '@/lib/plugins';
import type { Metadata } from 'rari';

export default async function MarketplacePage() {
  let initial: MarketplaceEntry[] = [];
  let error: string | null = null;
  try {
    initial = await getMarketplace();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load marketplace';
  }

  return <MarketplaceManager initial={initial} loadError={error} />;
}

export const metadata: Metadata = {
  title: 'Marketplace | OpenCMS',
};
