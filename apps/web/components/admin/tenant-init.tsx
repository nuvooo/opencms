'use client';

import { getTenants } from '@/server/tenant.server';
import { useEffect } from 'react';

/**
 * Headless initializer for the active admin tenant.
 *
 * Every admin page reads the active tenant from localStorage['admin-tenant-id']
 * and sends it as the `x-tenant-id` header. Previously the sidebar TenantSelector
 * seeded that value (first tenant) on mount; it was removed from the sidebar, so
 * nothing set a default anymore and the admin pages broke (empty header -> 404).
 *
 * This component restores the default without any visible switcher UI. It also
 * heals a stale id (e.g. the stored tenant was deleted) by falling back to the
 * first available tenant.
 */
const TenantInit = () => {
  useEffect(() => {
    getTenants()
      .then((list) => {
        const first = list[0];
        if (!first) return;
        const stored = localStorage.getItem('admin-tenant-id');
        const valid = !!stored && list.some((t) => t.id === stored);
        if (!valid) {
          localStorage.setItem('admin-tenant-id', first.id);
        }
      })
      .catch(console.error);
  }, []);

  return null;
};

export default TenantInit;
