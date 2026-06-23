import AdminShell from '@/components/admin/admin-shell';
import type { LayoutProps } from 'rari';

/**
 * Admin layout. Thin server wrapper around the client {@link AdminShell}, which
 * handles the session gate and the plugin-driven sidebar (both need request
 * cookies, available only to server actions in rari).
 */
export default function AdminLayout({ children }: LayoutProps) {
  return <AdminShell>{children}</AdminShell>;
}
