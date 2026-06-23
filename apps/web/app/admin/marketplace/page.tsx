'use client';

import { getIcon } from '@/lib/plugin/icons';
import { usePluginRegistry } from '@/lib/plugin/registry';
import { MarketplaceEntry } from '@/server/plugin.schema';
import { getMarketplace, installFromMarketplace } from '@/server/plugin.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { toast } from '@repo/shadcn/sonner';
import { useCallback, useEffect, useState } from 'react';

const Page = () => {
  // Installing a plugin changes the sidebar nav, so push the refreshed plugin
  // list through the shared registry just like the Plugins page does.
  const { setPlugins: setRegistryPlugins } = usePluginRegistry();
  const [entries, setEntries] = useState<MarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getMarketplace()
      .then((data) => {
        setEntries(data);
        setError(null);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load marketplace';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInstall = async (entry: MarketplaceEntry) => {
    setInstallingId(entry.id);
    try {
      const plugins = await installFromMarketplace(entry.id);
      setRegistryPlugins(plugins);
      // Refresh the catalog so the card flips to "Installed".
      const next = await getMarketplace();
      setEntries(next);
      setError(null);
      toast.success(`Installed ${entry.name}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to install plugin';
      setError(message);
      toast.error(message);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Browse and install official plugins.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No plugins available in the marketplace.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    {getIcon(entry.icon)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{entry.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      v{entry.version}
                      {entry.author ? ` · ${entry.author}` : ''}
                    </p>
                  </div>
                </div>
                {entry.installed && (
                  <Badge variant="secondary" className="text-xs">
                    Installed
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleInstall(entry)}
                    disabled={entry.installed || installingId !== null}
                  >
                    {installingId === entry.id
                      ? 'Installing...'
                      : entry.installed
                        ? 'Installed'
                        : 'Install'}
                  </Button>
                  {entry.homepage && (
                    <a
                      href={entry.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Details
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;
