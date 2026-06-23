'use client';

import { listPlugins } from '@/actions/plugins';
import { useEffect, useState } from 'react';

export default function DashboardView() {
  const [stats, setStats] = useState<{ enabled: number; total: number } | null>(
    null,
  );
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    listPlugins()
      .then((plugins) =>
        setStats({
          enabled: plugins.filter((p) => p.enabled).length,
          total: plugins.length,
        }),
      )
      .catch(() => setUnreachable(true));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          OpenCMS admin running on the rari runtime.
        </p>
      </div>

      {unreachable ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Could not reach the API. Is it running on the configured API_URL?
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Plugins enabled</p>
            <p className="mt-1 text-3xl font-bold">{stats?.enabled ?? '—'}</p>
          </div>
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Plugins total</p>
            <p className="mt-1 text-3xl font-bold">{stats?.total ?? '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
