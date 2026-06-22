'use client';

import { getContentTypes } from '@/server/content-type.server';
import { deleteEntry, getEntries } from '@/server/entry.server';
import { ContentType } from '@/types/content-type.type';
import { Entry } from '@/types/entry.type';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/shadcn/alert-dialog';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Pencil, Plus, Trash2 } from '@repo/shadcn/lucide';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { toast } from '@repo/shadcn/sonner';
import { formatDate } from '@repo/utils/date';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

const displayFieldTypes = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'boolean',
  'date',
  'datetime',
  'time',
  'select',
  'slug',
  'color',
  'email',
  'url',
  'phone',
];

const renderCellValue = (value: unknown, type: string) => {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'color') return String(value);
  return String(value).substring(0, 80);
};

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [filterSlug, setFilterSlug] = useState(
    searchParams.get('content_type_slug') || 'all',
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      Promise.all([getEntries(stored), getContentTypes(stored)])
        .then(([entriesData, ctData]) => {
          setEntries(entriesData);
          setContentTypes(ctData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    setDeletingId(id);
    try {
      await deleteEntry(tenantId, id);
      toast.success('Entry deleted successfully');
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete entry';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEntries =
    filterSlug === 'all'
      ? entries
      : entries.filter((e) => e.content_type_slug === filterSlug);

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entries</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content entries.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Please select a tenant from the sidebar to view entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entries</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content entries.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/entries/create">
            <Plus className="size-4" />
            Create Entry
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by type:</span>
        <Select
          value={filterSlug}
          onValueChange={(v) => {
            setFilterSlug(v);
            router.replace(
              v === 'all'
                ? '/admin/entries'
                : `/admin/entries?content_type_slug=${v}`,
            );
          }}
        >
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {contentTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.slug}>
                {ct.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No entries yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/entries/create">Create your first entry</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Content Type
                  </th>
                  {filterSlug !== 'all' &&
                    contentTypes
                      .find((ct) => ct.slug === filterSlug)
                      ?.fields.filter((f) => displayFieldTypes.includes(f.type))
                      .slice(0, 3)
                      .map((f) => (
                        <th
                          key={f.name}
                          className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                        >
                          {f.label || f.name}
                        </th>
                      ))}
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Locale
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const ct = contentTypes.find(
                    (c) => c.slug === entry.content_type_slug,
                  );
                  const displayFields =
                    ct?.fields
                      .filter((f) => displayFieldTypes.includes(f.type))
                      .slice(0, 3) || [];
                  return (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {entry.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {ct?.name || entry.content_type_slug}
                      </td>
                      {displayFields.map((f) => (
                        <td
                          key={f.name}
                          className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]"
                        >
                          {renderCellValue(entry.fields?.[f.name], f.type)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={statusVariant[entry.status] || 'secondary'}
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.locale}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(entry.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/entries/${entry.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this entry. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {deletingId === entry.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
