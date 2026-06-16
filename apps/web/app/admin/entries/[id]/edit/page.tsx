'use client';

import EntryPreview from '@/components/admin/entry-preview';
import ImagePicker from '@/components/admin/image-picker';
import RelationPicker from '@/components/admin/relation-picker';
import {
  buildActiveFields,
  isFieldEnabled as fieldEnabled,
  initEnabledFromEntry,
} from '@/lib/entry-fields';
import { getContentTypes } from '@/server/content-type.server';
import {
  createEntry,
  getEntries,
  getEntry,
  updateEntry,
} from '@/server/entry.server';
import { getLocales } from '@/server/locale.server';
import { setRelations } from '@/server/relation.server';
import { ContentType, ContentTypeField } from '@/types/content-type.type';
import type { Entry } from '@/types/entry.type';
import type { Locale } from '@/types/locale.type';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Checkbox } from '@repo/shadcn/checkbox';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { cn } from '@repo/shadcn/lib/utils';
import { ArrowLeft, Eye, Plus } from '@repo/shadcn/lucide';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { toast } from '@repo/shadcn/sonner';
import { Switch } from '@repo/shadcn/switch';
import { Textarea } from '@repo/shadcn/textarea';
import { RichTextEditor } from '@repo/shadcn/tiptap/rich-text-editor';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

const Page = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [groupEntries, setGroupEntries] = useState<Entry[]>([]);
  const [selectedCt, setSelectedCt] = useState<string>('');
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>(
    {},
  );
  const [locale, setLocale] = useState('en');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    'draft',
  );
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
    if (stored) {
      getEntry(stored, id)
        .then(async (entryData) => {
          setEntry(entryData);
          setSelectedCt(entryData.content_type_slug);
          setFields(entryData.fields as Record<string, unknown>);
          setLocale(entryData.locale);
          setStatus(entryData.status as 'draft' | 'published' | 'archived');

          const [ctData, locs] = await Promise.all([
            getContentTypes(stored),
            getLocales(stored),
          ]);
          setContentTypes(ctData);
          setLocales(locs);

          const loadedCt = ctData.find(
            (ct) => ct.slug === entryData.content_type_slug,
          );
          if (loadedCt) {
            setEnabledFields(
              initEnabledFromEntry(
                loadedCt.fields,
                entryData.fields as Record<string, unknown> | null | undefined,
              ),
            );
          }

          if (entryData.locale_group_id) {
            const group = await getEntries(stored, {
              locale_group_id: entryData.locale_group_id,
            });
            setGroupEntries(group);
          }
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Failed to load entry'),
        )
        .finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [id]);

  const currentCt = contentTypes.find((ct) => ct.slug === selectedCt);

  const isFieldEnabled = (name: string) => fieldEnabled(enabledFields, name);
  const toggleField = (name: string) =>
    setEnabledFields((p) => ({
      ...p,
      [name]: p[name] === false ? true : false,
    }));

  const localeEntryMap = new Map<string, Entry>();
  for (const ge of groupEntries) {
    localeEntryMap.set(ge.locale, ge);
  }

  const handleAddTranslation = async (localeCode: string) => {
    if (!tenantId || !entry) return;
    try {
      const newEntry = await createEntry(tenantId, {
        content_type_slug: entry.content_type_slug,
        fields: {},
        locale: localeCode,
        status: 'draft',
        locale_group_id: entry.locale_group_id,
      });
      toast.success(`Added ${localeCode} translation`);
      router.push(`/admin/entries/${newEntry.id}/edit`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to add translation',
      );
    }
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const renderFieldInput = (field: ContentTypeField) => {
    const value = fields[field.name] ?? '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
          />
        );
      case 'rich_text':
        return (
          <RichTextEditor
            content={value as string}
            onChange={(html: string) => handleFieldChange(field.name, html)}
            minHeight="250px"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked: boolean) =>
                handleFieldChange(field.name, checked)
              }
            />
            <Label className="text-sm text-muted-foreground cursor-pointer">
              {field.label || field.name}
            </Label>
          </div>
        );
      case 'image':
        return tenantId ? (
          <ImagePicker
            tenantId={tenantId}
            value={value as string}
            onChange={(val: string) => handleFieldChange(field.name, val)}
          />
        ) : (
          <Input
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
          />
        );
      case 'select': {
        const choices = field.options?.choices || [];
        return (
          <Select
            value={value as string}
            onValueChange={(val: string) => handleFieldChange(field.name, val)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${field.label || field.name}`}
              />
            </SelectTrigger>
            <SelectContent>
              {choices.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'slug':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <Input
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
          />
        );
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={(value as string) || '#000000'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange(field.name, e.target.value)
              }
              className="w-12 h-9 p-1"
            />
            <Input
              value={value as string}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange(field.name, e.target.value)
              }
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        );
      case 'json':
        return (
          <Textarea
            value={
              typeof value === 'string' ? value : JSON.stringify(value, null, 2)
            }
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
            className="font-mono text-xs"
            rows={8}
          />
        );
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
          />
        );
      case 'm2o':
        return tenantId ? (
          <RelationPicker
            tenantId={tenantId}
            relatedType={field.options?.relatedType || ''}
            displayField={field.options?.displayField}
            value={value as string}
            onChange={(v) => handleFieldChange(field.name, v)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Select a tenant first</p>
        );
      case 'm2m':
        return tenantId ? (
          <RelationPicker
            tenantId={tenantId}
            relatedType={field.options?.relatedType || ''}
            displayField={field.options?.displayField}
            value={(value as string[]) || []}
            multiple
            onChange={(v) => handleFieldChange(field.name, v)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Select a tenant first</p>
        );
      case 'o2m':
        return (
          <p className="text-sm text-muted-foreground italic">
            This field displays entries that reference this entry. Manage
            relationships from the related entry&apos;s m2o field.
          </p>
        );
      default:
        return (
          <Input
            value={value as string}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange(field.name, e.target.value)
            }
            placeholder={field.label || field.name}
          />
        );
    }
  };

  const validate = (): string | null => {
    if (!currentCt) return null;
    for (const f of currentCt.fields) {
      if (enabledFields[f.name] === false) continue;
      const val = fields[f.name];
      if (f.options?.required && (!val || val === '')) {
        return `"${f.label || f.name}" is required`;
      }
      if (f.options?.min && typeof val === 'number' && val < f.options.min) {
        return `"${f.label || f.name}" must be at least ${f.options.min}`;
      }
      if (f.options?.max && typeof val === 'number' && val > f.options.max) {
        return `"${f.label || f.name}" must be at most ${f.options.max}`;
      }
      if (f.options?.pattern && typeof val === 'string') {
        try {
          if (!new RegExp(f.options.pattern).test(val)) {
            return `"${f.label || f.name}" does not match the required pattern`;
          }
        } catch {
          /* invalid regex */
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setError('Please select a tenant from the sidebar.');
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const activeFields = buildActiveFields(
        currentCt!.fields,
        enabledFields,
        fields,
      );

      await updateEntry(tenantId, id, {
        content_type_slug: selectedCt,
        fields: activeFields,
        locale,
        status,
      });

      const relFields = currentCt?.fields.filter(
        (f) => f.type === 'm2o' || f.type === 'm2m',
      );
      for (const rf of relFields || []) {
        if (enabledFields[rf.name] === false) continue;
        const val = fields[rf.name];
        const ids =
          rf.type === 'm2o'
            ? val
              ? [val as string]
              : []
            : (val as string[]) || [];
        await setRelations(tenantId, id, rf.name, ids);
      }

      toast.success('Entry updated successfully');
      router.push('/admin/entries');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update entry';
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
            <Link href="/admin/entries">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Entry</h1>
          </div>
        </div>
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/entries">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Entry</h1>
            <p className="text-muted-foreground mt-1">Update content entry.</p>
          </div>
        </div>
        {currentCt && (
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="size-4" />
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Content Type</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">
                  {currentCt?.name || selectedCt}
                </span>
                <span className="text-muted-foreground">({selectedCt})</span>
              </div>
            </div>

            {tenantId && (
              <div className="pt-2">
                <Label className="text-base font-medium mb-2 block">
                  Language
                </Label>
                <div className="flex flex-wrap gap-1 border-b mb-4">
                  {locales.map((l) => {
                    const version = localeEntryMap.get(l.code);
                    const isActive = l.code === locale;
                    return (
                      <div key={l.code} className="flex items-center">
                        {version ? (
                          <Link
                            href={`/admin/entries/${version.id}/edit`}
                            className={cn(
                              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                              isActive
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {l.name}
                            {l.is_default && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (default)
                              </span>
                            )}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddTranslation(l.code)}
                            className={cn(
                              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                              'border-dashed border-transparent text-muted-foreground/50 hover:text-foreground hover:border-muted-foreground/30',
                            )}
                          >
                            <Plus className="size-3 inline mr-1" />
                            {l.name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentCt && (
              <div className="space-y-4 pt-2">
                <Label className="text-base font-medium">Fields</Label>
                {currentCt.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {field.label || field.name}
                        {field.options?.required &&
                          isFieldEnabled(field.name) && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                      </Label>
                      <Switch
                        checked={isFieldEnabled(field.name)}
                        onCheckedChange={() => toggleField(field.name)}
                      />
                    </div>
                    {isFieldEnabled(field.name) && renderFieldInput(field)}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(val: 'draft' | 'published' | 'archived') =>
                  setStatus(val)
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !tenantId}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/entries">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showPreview && currentCt && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryPreview fields={fields} contentType={currentCt} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Page;
