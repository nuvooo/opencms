'use client';

import { getSeoSettings, updateSeoSettings } from '@/actions/seo';
import type { SeoSettings } from '@/lib/seo';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { Textarea } from '@repo/shadcn/textarea';
import { useEffect, useState } from 'react';

export default function SeoPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('admin-tenant-id');
    setTenantId(id);
    if (!id) {
      setError('No active tenant selected.');
      setLoading(false);
      return;
    }
    getSeoSettings(id)
      .then((data) => {
        setSettings(data);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load SEO'),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) =>
    setSettings((cur) => (cur ? { ...cur, [key]: value } : cur));

  const handleSave = async () => {
    if (!tenantId || !settings) return;
    setSaving(true);
    try {
      const saved = await updateSeoSettings(tenantId, {
        siteUrl: settings.siteUrl,
        siteName: settings.siteName,
        titleTemplate: settings.titleTemplate,
        defaultDescription: settings.defaultDescription,
        robotsTxt: settings.robotsTxt,
        sitemapEnabled: settings.sitemapEnabled,
        ogImageUrl: settings.ogImageUrl,
        twitterHandle: settings.twitterHandle,
      });
      setSettings(saved);
      toast.success('SEO settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SEO</h1>
        <p className="mt-1 text-muted-foreground">
          Site-wide metadata, robots.txt and sitemap.xml.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : settings ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  placeholder="https://example.com"
                  value={settings.siteUrl}
                  onChange={(e) => update('siteUrl', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siteName">Site name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => update('siteName', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="titleTemplate">Title template</Label>
                <Input
                  id="titleTemplate"
                  placeholder="%s · Acme"
                  value={settings.titleTemplate}
                  onChange={(e) => update('titleTemplate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultDescription">Default description</Label>
                <Input
                  id="defaultDescription"
                  value={settings.defaultDescription}
                  onChange={(e) => update('defaultDescription', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Sitemap &amp; robots.txt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Serve sitemap.xml</p>
                  <p className="text-xs text-muted-foreground">
                    Available at <code>/api/seo/sitemap.xml</code>.
                  </p>
                </div>
                <Switch
                  checked={settings.sitemapEnabled}
                  onCheckedChange={(value: boolean) =>
                    update('sitemapEnabled', value)
                  }
                  aria-label="Toggle sitemap"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="robotsTxt">robots.txt</Label>
                <Textarea
                  id="robotsTxt"
                  rows={6}
                  placeholder="Leave empty to use a generated default."
                  value={settings.robotsTxt}
                  onChange={(e) => update('robotsTxt', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
