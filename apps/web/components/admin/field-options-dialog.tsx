'use client';

import type { ContentTypeFieldOptions } from '@/types/content-type.type';
import { Button } from '@repo/shadcn/button';
import { Checkbox } from '@repo/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import { Settings2 } from '@repo/shadcn/lucide';
import { useState } from 'react';

interface FieldOptionsDialogProps {
  options?: ContentTypeFieldOptions;
  fieldType: string;
  allFieldNames: string[];
  onChange: (options: ContentTypeFieldOptions) => void;
}

export default function FieldOptionsDialog({
  options,
  fieldType,
  allFieldNames,
  onChange,
}: FieldOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<ContentTypeFieldOptions>(options || {});

  const handleSave = () => {
    onChange(local);
    setOpen(false);
  };

  const toggle = (key: keyof ContentTypeFieldOptions) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setNum = (key: 'min' | 'max', value: string) => {
    setLocal((prev) => ({
      ...prev,
      [key]: value ? Number(value) : undefined,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-7">
          <Settings2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Field Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="opt-required"
              checked={local.required || false}
              onCheckedChange={() => toggle('required')}
            />
            <Label htmlFor="opt-required">Required</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="opt-unique"
              checked={local.unique || false}
              onCheckedChange={() => toggle('unique')}
            />
            <Label htmlFor="opt-unique">Unique</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={local.min ?? ''}
                onChange={(e) => setNum('min', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={local.max ?? ''}
                onChange={(e) => setNum('max', e.target.value)}
                placeholder="999"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Regex Pattern</Label>
            <Input
              value={local.pattern || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  pattern: e.target.value || undefined,
                }))
              }
              placeholder="^[a-z]+$"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={local.placeholder || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  placeholder: e.target.value || undefined,
                }))
              }
              placeholder="Placeholder text"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Help Text</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
              rows={2}
              value={local.helpText || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  helpText: e.target.value || undefined,
                }))
              }
              placeholder="Optional help text"
            />
          </div>

          {fieldType === 'slug' && (
            <div className="space-y-1">
              <Label className="text-xs">Generate From Field</Label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                value={local.slugFrom || ''}
                onChange={(e) =>
                  setLocal((prev) => ({
                    ...prev,
                    slugFrom: e.target.value || undefined,
                  }))
                }
              >
                <option value="">None</option>
                {allFieldNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(fieldType === 'm2o' || fieldType === 'm2m') && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Related Content Type (slug)</Label>
                <Input
                  value={local.relatedType || ''}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      relatedType: e.target.value || undefined,
                    }))
                  }
                  placeholder="article"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Field</Label>
                <Input
                  value={local.displayField || ''}
                  onChange={(e) =>
                    setLocal((prev) => ({
                      ...prev,
                      displayField: e.target.value || undefined,
                    }))
                  }
                  placeholder="title"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
