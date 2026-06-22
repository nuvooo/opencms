'use client';

import { createTenant } from '@/server/tenant.server';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { ArrowLeft } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

const Page = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [locales, setLocales] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await createTenant({
        name,
        slug,
        domain: domain || null,
        locales: localeList,
      });
      toast.success('Tenant created successfully');
      router.push('/admin/tenants');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tenant';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tenant</h1>
          <p className="text-muted-foreground mt-1">
            Add a new tenant to your CMS.
          </p>
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
                {loading ? 'Creating...' : 'Create Tenant'}
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
