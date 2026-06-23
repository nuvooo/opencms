'use client';

import { installFromMarketplace, listMarketplace } from '@/actions/plugins';
import { getIcon } from '@/lib/icons';
import type { MarketplaceEntry } from '@/lib/plugins';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { toast } from '@repo/shadcn/sonner';
import { useState } from 'react';

interface Props {
  initial: MarketplaceEntry[];
  loadError: string | null;
}

export default function MarketplaceManager({ initial, loadError }: Props) {
  const [entries, setEntries] = useState<MarketplaceEntry[]>(initial);
  const [error, setError] = useState<string | null>(loadError);
  const [refreshing, setRefreshing] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setEntries(await listMarketplace());
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load marketplace';
      setError(message);
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleInstall = async (entry: MarketplaceEntry) => {
    setInstallingId(entry.id);
    try {
      await installFromMarketplace(entry.id);
      setEntries(await listMarketplace());
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
        <p className="mt-1 text-muted-foreground">
          Browse and install official plugins.
        </p>
      </div>

      <Button variant="outline" onClick={refresh} disabled={refreshing}>
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </Button>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
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
                <div className="mt-4">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
