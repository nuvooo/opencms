'use client';

import { usePluginRegistry } from '@/lib/plugin/registry';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';

/**
 * Determines whether `pathname` is covered by a nav item `path` — either an
 * exact match or a nested route (`/admin/foo` owns `/admin/foo/bar`).
 */
const pathMatches = (pathname: string, path: string): boolean =>
  pathname === path || pathname.startsWith(`${path}/`);

/**
 * Blocks admin routes that belong to a disabled plugin. The sidebar already
 * hides their nav entries; this stops the page from rendering when the URL is
 * opened directly, redirecting to the dashboard instead. Protected core plugins
 * are always enabled, so they are never blocked.
 */
const PluginRouteGuard = ({ children }: { children: ReactNode }) => {
  const { plugins } = usePluginRegistry();
  const pathname = usePathname();
  const router = useRouter();

  // The owning plugin is the one whose nav item path is the longest match, so
  // e.g. `/admin/entries/create` resolves to `entries`, not `dashboard`.
  const owner = useMemo(() => {
    let best: (typeof plugins)[number] | null = null;
    let bestLength = -1;
    for (const plugin of plugins) {
      for (const nav of plugin.navItems) {
        if (pathMatches(pathname, nav.path) && nav.path.length > bestLength) {
          best = plugin;
          bestLength = nav.path.length;
        }
      }
    }
    return best;
  }, [plugins, pathname]);

  const blocked = owner ? !owner.enabled : false;

  useEffect(() => {
    if (blocked) router.replace('/admin');
  }, [blocked, router]);

  if (blocked) return null;
  return <>{children}</>;
};

export default PluginRouteGuard;
