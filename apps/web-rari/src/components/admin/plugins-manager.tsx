'use client';

import { listPlugins, rescanPlugins, togglePlugin } from '@/actions/plugins';
import { getIcon } from '@/lib/icons';
import type { PluginDescriptor } from '@/lib/plugins';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { useEffect, useState } from 'react';

export default function PluginsManager() {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    listPlugins()
      .then((data) => {
        setPlugins(data);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load plugins'),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try {
      setPlugins(await togglePlugin(id, enabled));
      setError(null);
      toast.success(`Plugin ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update plugin',
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      setPlugins(await rescanPlugins());
      setError(null);
      toast.success('Plugins rescanned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rescan');
    } finally {
      setRescanning(false);
    }
  };

  const system = plugins.filter((p) => p.source === 'core');
  const user = plugins.filter((p) => p.source === 'user');

  const renderCard = (plugin: PluginDescriptor, badge: string) => (
    <Card key={plugin.id}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            {getIcon(plugin.icon)}
          </div>
          <div>
            <CardTitle className="text-base">{plugin.name}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              v{plugin.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={plugin.enabled}
            disabled={plugin.protected || togglingId === plugin.id}
            onCheckedChange={(value: boolean) => handleToggle(plugin.id, value)}
            aria-label={`Toggle ${plugin.name}`}
          />
          <Badge variant="outline" className="text-xs">
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{plugin.description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plugins</h1>
        <p className="mt-1 text-muted-foreground">
          Manage system plugins and features.
        </p>
      </div>

      <Button
        variant="outline"
        onClick={handleRescan}
        disabled={rescanning || loading}
      >
        {rescanning ? 'Rescanning...' : 'Rescan Plugins'}
      </Button>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">System Plugins</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {system.map((p) => renderCard(p, 'System'))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Installed Plugins</h2>
            {user.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No installed plugins yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {user.map((p) => renderCard(p, 'Installed'))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
