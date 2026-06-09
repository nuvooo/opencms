'use client';

import {
  deleteContentType,
  getContentTypes,
} from '@/server/content-type.server';
import { ContentType } from '@/types/content-type.type';
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
import { toast } from '@repo/shadcn/sonner';
import { formatDate } from '@repo/utils/date';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const Page = () => {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      getContentTypes(stored)
        .then(setContentTypes)
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
      await deleteContentType(tenantId, id);
      toast.success('Content type deleted successfully');
      setContentTypes((prev) => prev.filter((ct) => ct.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete content type';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Types</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content type schemas.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Please select a tenant from the sidebar to view content types.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Types</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content type schemas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content-types/create">
            <Plus className="size-4" />
            Create Content Type
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : contentTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No content types yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/content-types/create">
              Create your first content type
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Fields
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
                {contentTypes.map((ct) => (
                  <tr
                    key={ct.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{ct.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ct.slug}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="secondary">{ct.fields.length}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(ct.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/content-types/${ct.id}/edit`}>
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
                            <AlertDialogTitle>
                              Delete content type?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete{' '}
                              <strong>{ct.name}</strong> and all associated
                              entries. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(ct.id)}
                              disabled={deletingId === ct.id}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {deletingId === ct.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
