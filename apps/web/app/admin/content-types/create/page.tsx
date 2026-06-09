'use client';

import FieldOptionsDialog from '@/components/admin/field-options-dialog';
import FieldTypePicker from '@/components/admin/field-type-picker';
import { createContentType } from '@/server/content-type.server';
import {
  type ContentTypeField,
  type ContentTypeFieldOptions,
} from '@/types/content-type.type';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { ArrowLeft, GripVertical, Plus, X } from '@repo/shadcn/lucide';
import { toast } from '@repo/shadcn/sonner';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@repo/shadcn/sortable';
import { Textarea } from '@repo/shadcn/textarea';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

const defaultField = (): ContentTypeField => ({
  name: '',
  type: 'text',
  options: {},
});

const Page = () => {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ContentTypeField[]>([defaultField()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    setTenantId(stored);
  }, []);

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

  const addField = () => {
    setFields([...fields, defaultField()]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, value: unknown) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };

  const fieldNames = fields.map((f) => f.name).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setError('Please select a tenant from the sidebar.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await createContentType(tenantId, {
        name,
        slug,
        description: description || null,
        fields: fields as unknown as ContentTypeField[],
      });
      toast.success('Content type created successfully');
      router.push('/admin/content-types');
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create content type';
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
          <Link href="/admin/content-types">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Content Type
          </h1>
          <p className="text-muted-foreground mt-1">
            Define a new content schema.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Type Details</CardTitle>
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
                placeholder="Article"
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
                placeholder="article"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Optional description"
              />
            </div>

            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addField}
                >
                  <Plus className="size-3" />
                  Add Field
                </Button>
              </div>

              <Sortable
                value={fields.map((_, i) => String(i))}
                onValueChange={(value) => {
                  const reordered = value.map(
                    (id: string) => fields[Number(id)],
                  );
                  setFields(reordered);
                }}
              >
                <SortableContent className="space-y-2">
                  {fields.map((field, index) => (
                    <SortableItem key={String(index)} value={String(index)}>
                      <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                        <SortableItemHandle className="mt-2">
                          <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                        </SortableItemHandle>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                updateField(index, 'name', e.target.value)
                              }
                              placeholder="field_name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <FieldTypePicker
                              value={field.type}
                              onChange={(value: string) =>
                                updateField(index, 'type', value)
                              }
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label || ''}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                updateField(
                                  index,
                                  'label',
                                  e.target.value || undefined,
                                )
                              }
                              placeholder="Field Label"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-5">
                          <FieldOptionsDialog
                            options={field.options}
                            fieldType={field.type}
                            allFieldNames={fieldNames}
                            onChange={(opts: ContentTypeFieldOptions) =>
                              updateField(index, 'options', opts)
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => removeField(index)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </SortableItem>
                  ))}
                </SortableContent>
                <SortableOverlay>
                  <div className="flex items-start gap-2 p-3 rounded-lg border bg-background shadow-md">
                    <GripVertical className="size-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm font-medium">Field</div>
                  </div>
                </SortableOverlay>
              </Sortable>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !tenantId}>
                {loading ? 'Creating...' : 'Create Content Type'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/content-types">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
