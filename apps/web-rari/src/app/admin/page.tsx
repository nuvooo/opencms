import { getPlugins } from '@/lib/plugins';
import type { Metadata } from 'rari';

export default async function DashboardPage() {
  let enabledCount = 0;
  let total = 0;
  let unreachable = false;
  try {
    const plugins = await getPlugins();
    total = plugins.length;
    enabledCount = plugins.filter((p) => p.enabled).length;
  } catch {
    unreachable = true;
  }

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
            <p className="mt-1 text-3xl font-bold">{enabledCount}</p>
          </div>
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Plugins total</p>
            <p className="mt-1 text-3xl font-bold">{total}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Dashboard | OpenCMS',
};
