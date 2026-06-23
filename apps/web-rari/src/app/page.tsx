import EntryRedirect from '@/components/entry-redirect';
import type { Metadata } from 'rari';

export default function IndexPage() {
  return <EntryRedirect />;
}

export const metadata: Metadata = {
  title: 'OpenCMS',
};
