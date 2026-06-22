'use client';

import { getPlugins } from '@/server/plugin.server';
import { getTenants } from '@/server/tenant.server';
import type { Tenant } from '@/types/tenant.type';
import { cn } from '@repo/shadcn/lib/utils';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TenantTabs() {
  const pathname = usePathname();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [multiTenant, setMultiTenant] = useState(false);

  useEffect(() => {
    getPlugins()
      .then((plugins) => {
        const tenantsPlugin = plugins.find((p) => p.id === 'tenants');
        setMultiTenant(tenantsPlugin?.enabled ?? false);
      })
      .catch(() => setMultiTenant(false));
    getTenants().then(setTenants).catch(console.error);
    setSelectedId(localStorage.getItem('admin-tenant-id') || '');
  }, []);

  const handleSwitch = (id: string) => {
    localStorage.setItem('admin-tenant-id', id);
    window.location.href = pathname;
  };

  if (!multiTenant || tenants.length < 2) return null;

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1 px-4 lg:px-6 overflow-x-auto">
        {tenants.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSwitch(t.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              selectedId === t.id
                ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
