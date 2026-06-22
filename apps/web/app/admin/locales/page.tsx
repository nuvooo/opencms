'use client';

import {
  createLocale,
  deleteLocale,
  getLocales,
  updateLocale,
} from '@/server/locale.server';
import type { Locale } from '@/types/locale.type';
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
import { Button } from '@repo/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Pencil, Plus, Trash2 } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { useEffect, useState } from 'react';

const Page = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Locale | null>(null);
  const [form, setForm] = useState({ code: '', name: '', is_default: false });

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      getLocales(stored)
        .then(setLocales)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', is_default: false });
    setDialogOpen(true);
  };

  const openEdit = (locale: Locale) => {
    setEditing(locale);
    setForm({
      code: locale.code,
      name: locale.name,
      is_default: locale.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    try {
      if (editing) {
        const updated = await updateLocale(tenantId, editing.id, form);
        setLocales((prev) =>
          prev.map((l) => (l.id === editing.id ? updated : l)),
        );
        toast.success('Locale updated');
      } else {
        const created = await createLocale(tenantId, form);
        setLocales((prev) => [...prev, created]);
        toast.success('Locale created');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save locale');
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    try {
      await deleteLocale(tenantId, id);
      setLocales((prev) => prev.filter((l) => l.id !== id));
      toast.success('Locale deleted');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete locale',
      );
    }
  };

  const handleToggleDefault = async (locale: Locale) => {
    if (!tenantId || locale.is_default) return;
    try {
      await updateLocale(tenantId, locale.id, {
        is_default: true,
      });
      setLocales((prev) =>
        prev.map((l) => ({
          ...l,
          is_default: l.id === locale.id,
        })),
      );
      toast.success(`"${locale.name}" is now the default locale`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to set default locale',
      );
    }
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Locales</h1>
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Please select a tenant from the sidebar.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locales</h1>
          <p className="text-muted-foreground mt-1">
            Manage languages for your tenant.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add Locale
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : locales.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No locales yet.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4">
            Add your first locale
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Default
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {locales.map((locale) => (
                  <tr
                    key={locale.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium">
                      {locale.code}
                    </td>
                    <td className="px-4 py-3 text-sm">{locale.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <Switch
                        checked={locale.is_default}
                        onCheckedChange={() => handleToggleDefault(locale)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(locale)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={locale.is_default}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete locale &ldquo;{locale.name}&rdquo;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this locale. Entries
                              using this locale will not be deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(locale.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Locale' : 'Add Locale'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the locale details.'
                : 'Add a new language for your tenant.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g. en, de, fr"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. English, German, French"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_default"
                checked={form.is_default}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_default: checked })
                }
              />
              <Label htmlFor="is_default">Set as default locale</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
