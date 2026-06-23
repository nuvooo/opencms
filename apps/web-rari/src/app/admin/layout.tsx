import AdminSidebar from '@/components/admin/sidebar';
import { getPlugins, type PluginNavItem } from '@/lib/plugins';
import { getSession } from '@/lib/session';
import type { LayoutProps } from 'rari';

/**
 * Admin shell. Server component: resolves the session and the enabled plugins,
 * then derives the sidebar navigation from each enabled plugin's navItems —
 * the same registry-driven model the Next.js app uses.
 */
export default async function AdminLayout({ children }: LayoutProps) {
  const session = await getSession();

  let navItems: PluginNavItem[] = [];
  try {
    const plugins = await getPlugins();
    navItems = plugins
      .filter((plugin) => plugin.enabled)
      .flatMap((plugin) => plugin.navItems);
  } catch {
    // API unreachable: render the shell with an empty nav rather than crashing.
    navItems = [];
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar navItems={navItems} email={session?.user.email ?? null} />
      <main className="flex-1 overflow-x-hidden px-6 py-6">{children}</main>
    </div>
  );
}
