'use client';

import { deleteTenant, setTemplateTenant } from '@/server/tenant.server';
import { Tenant } from '@/types/tenant.type';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TenantsTable({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTenant(id);
      toast.success('Tenant deleted successfully');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete tenant';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage your multi-tenant environments.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants/create">
            <Plus className="size-4" />
            Create Tenant
          </Link>
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No tenants yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/tenants/create">Create your first tenant</Link>
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
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Locales
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Template
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {tenant.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {tenant.slug}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {tenant.domain || (
                        <span className="text-muted-foreground/50">
                          &mdash;
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {tenant.locales.map((locale) => (
                          <Badge key={locale} variant="secondary">
                            {locale}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tenant.isTemplate ? (
                        <Badge>Template</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await setTemplateTenant(tenant.id);
                              toast.success('Tenant set as template');
                              router.refresh();
                            } catch (err) {
                              const message =
                                err instanceof Error
                                  ? err.message
                                  : 'Failed to set template';
                              toast.error(message);
                            }
                          }}
                        >
                          Als Template
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/tenants/${tenant.id}/edit`}>
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
                            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete{' '}
                              <strong>{tenant.name}</strong> and all associated
                              data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(tenant.id)}
                              disabled={deletingId === tenant.id}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {deletingId === tenant.id
                                ? 'Deleting...'
                                : 'Delete'}
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
}
