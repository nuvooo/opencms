'use client';

import { getIcon } from '@/lib/plugin/icons';
import { usePluginRegistry } from '@/lib/plugin/registry';
import { PluginDescriptor } from '@/server/plugin.schema';
import {
  getPlugins,
  installPlugin,
  rescanPlugins,
  togglePlugin,
  uninstallPlugin,
} from '@/server/plugin.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { useCallback, useEffect, useState } from 'react';

const Page = () => {
  // The sidebar nav is driven by the shared plugin registry, so every update
  // here must be written through to it — otherwise an enable/disable only takes
  // visible effect after a full page refresh.
  const { setPlugins: setRegistryPlugins } = usePluginRegistry();
  const [plugins, setLocalPlugins] = useState<PluginDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const applyPlugins = useCallback(
    (next: PluginDescriptor[]) => {
      setLocalPlugins(next);
      setRegistryPlugins(next);
    },
    [setRegistryPlugins],
  );

  const handleToggle = async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try {
      const next = await togglePlugin(id, enabled);
      applyPlugins(next);
      setError(null);
      toast.success(`Plugin ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update plugin';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    getPlugins()
      .then((data) => {
        applyPlugins(data);
        setError(null);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load plugins';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const next = await rescanPlugins();
      applyPlugins(next);
      setError(null);
      toast.success('Plugins rescanned');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to rescan plugins';
      setError(message);
      toast.error(message);
    } finally {
      setRescanning(false);
    }
  };

  const handleInstall = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('file', file);
    setUploading(true);

    try {
      const next = await installPlugin(body);
      applyPlugins(next);
      setError(null);
      toast.success(`Installed ${file.name}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to install plugin';
      setError(message);
      toast.error(message);
    } finally {
      event.target.value = '';
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);
    try {
      const next = await uninstallPlugin(id);
      applyPlugins(next);
      setError(null);
      toast.success('Plugin removed');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove plugin';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  const isDeleteInFlight = deletingId !== null;

  const systemPlugins = plugins.filter((plugin) => plugin.source === 'core');
  const userPlugins = plugins.filter((plugin) => plugin.source === 'user');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plugins</h1>
        <p className="text-muted-foreground mt-1">
          Manage system plugins and features.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={handleRescan}
          disabled={loading || rescanning || uploading}
        >
          {rescanning ? 'Rescanning...' : 'Rescan Plugins'}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Install from ZIP</span>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={handleInstall}
            disabled={loading || uploading || rescanning}
            className="block w-full max-w-xs text-sm"
          />
        </label>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p>
          Plugin folders are here:{' '}
          <code className="rounded bg-background px-1 py-0.5 text-xs">
            core/plugins
          </code>{' '}
          for system plugins and{' '}
          <code className="rounded bg-background px-1 py-0.5 text-xs">
            plugins
          </code>{' '}
          for installed plugins.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">System Plugins</h2>
            {systemPlugins.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No system plugins found.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systemPlugins.map((plugin) => (
                  <Card key={plugin.id}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          {getIcon(plugin.icon)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {plugin.name}
                          </CardTitle>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            v{plugin.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plugin.enabled}
                          disabled={
                            plugin.protected || togglingId === plugin.id
                          }
                          onCheckedChange={(value: boolean) =>
                            handleToggle(plugin.id, value)
                          }
                          aria-label={`Toggle ${plugin.name}`}
                          title={
                            plugin.protected
                              ? 'This plugin cannot be disabled'
                              : undefined
                          }
                        />
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {plugin.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {plugin.navItems.map((nav) => (
                          <Badge
                            key={nav.path}
                            variant="outline"
                            className="text-xs"
                          >
                            {nav.label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Installed Plugins</h2>
            {userPlugins.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No installed plugins yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userPlugins.map((plugin) => (
                  <Card key={plugin.id}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          {getIcon(plugin.icon)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {plugin.name}
                          </CardTitle>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            v{plugin.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plugin.enabled}
                          disabled={
                            plugin.protected || togglingId === plugin.id
                          }
                          onCheckedChange={(value: boolean) =>
                            handleToggle(plugin.id, value)
                          }
                          aria-label={`Toggle ${plugin.name}`}
                        />
                        <Badge variant="secondary" className="text-xs">
                          Installed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {plugin.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {plugin.navItems.map((nav) => (
                          <Badge
                            key={nav.path}
                            variant="outline"
                            className="text-xs"
                          >
                            {nav.label}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(plugin.id)}
                          disabled={isDeleteInFlight || uploading || rescanning}
                        >
                          {deletingId === plugin.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Page;
