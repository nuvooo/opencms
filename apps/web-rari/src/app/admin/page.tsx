import DashboardView from '@/components/admin/dashboard-view';
import type { Metadata } from 'rari';

export default function DashboardPage() {
  return <DashboardView />;
}

export const metadata: Metadata = {
  title: 'Dashboard | OpenCMS',
};
