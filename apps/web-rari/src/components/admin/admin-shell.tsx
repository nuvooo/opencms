'use client';

import { getSessionUser } from '@/actions/auth';
import { listPlugins } from '@/actions/plugins';
import AdminSidebar from '@/components/admin/sidebar';
import type { PluginNavItem } from '@/lib/plugins';
import { useEffect, useState, type ReactNode } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'unauthed' }
  | { status: 'ready'; email: string | null; navItems: PluginNavItem[] };

/**
 * Client admin shell. rari only exposes request cookies to server actions, so
 * the session check and the plugin-driven navigation are loaded via server
 * actions here rather than in the (cookie-less) server layout.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await getSessionUser();
      if (!active) return;
      if (!user) {
        setState({ status: 'unauthed' });
        window.location.replace('/auth/sign-in');
        return;
      }
      let navItems: PluginNavItem[] = [];
      try {
        const plugins = await listPlugins();
        navItems = plugins.filter((p) => p.enabled).flatMap((p) => p.navItems);
      } catch {
        navItems = [];
      }
      if (!active) return;
      setState({ status: 'ready', email: user.email ?? null, navItems });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar navItems={state.navItems} email={state.email} />
      <main className="flex-1 overflow-x-hidden px-6 py-6">{children}</main>
    </div>
  );
}
