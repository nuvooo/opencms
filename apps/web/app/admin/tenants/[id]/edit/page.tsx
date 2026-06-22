'use client';

import { getTenant, updateTenant } from '@/server/tenant.server';
import { Tenant } from '@/types/tenant.type';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { ArrowLeft } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

const Page = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [locales, setLocales] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getTenant(id)
      .then((t) => {
        setTenant(t);
        setName(t.name);
        setSlug(t.slug);
        setDomain(t.domain || '');
        setLocales(t.locales.join(', '));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load tenant'),
      )
      .finally(() => setFetching(false));
  }, [id]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const localeList = locales
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      await updateTenant(id, {
        name,
        slug,
        domain: domain || null,
        locales: localeList,
      });
      toast.success('Tenant updated successfully');
      router.push('/admin/tenants');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update tenant';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/tenants">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Tenant</h1>
          </div>
        </div>
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/tenants">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Tenant</h1>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Tenant not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Tenant</h1>
          <p className="text-muted-foreground mt-1">Update tenant details.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="My Tenant"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSlug(e.target.value)
                }
                placeholder="my-tenant"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDomain(e.target.value)
                }
                placeholder="tenant.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locales">Locales</Label>
              <Input
                id="locales"
                value={locales}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLocales(e.target.value)
                }
                placeholder="en, de, fr"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated locale codes
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/tenants">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
