'use client';

import { getPlugins } from '@/server/plugin.server';
import { getTenants } from '@/server/tenant.server';
import { Tenant } from '@/types/tenant.type';
import { Building2 } from '@repo/shadcn/lucide';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { useEffect, useState } from 'react';

export default function TenantSelector() {
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
    getTenants()
      .then((list) => {
        setTenants(list);
        const firstTenant = list[0];
        if (!localStorage.getItem('admin-tenant-id') && firstTenant) {
          localStorage.setItem('admin-tenant-id', firstTenant.id);
        }
      })
      .catch(console.error);
    const stored = localStorage.getItem('admin-tenant-id');
    if (stored) setSelectedId(stored);
  }, []);

  const handleChange = (value: string) => {
    localStorage.setItem('admin-tenant-id', value);
    window.location.reload();
  };

  if (!multiTenant) return null;

  return (
    <div className="px-4 py-3 border-t">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Building2 className="size-3" />
        Active Tenant
      </div>
      <Select value={selectedId} onValueChange={handleChange}>
        <SelectTrigger className="w-full h-8 text-sm">
          <SelectValue placeholder="Select tenant..." />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
