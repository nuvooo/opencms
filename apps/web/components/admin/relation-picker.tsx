'use client';

import { getEntries } from '@/server/entry.server';
import type { Entry } from '@/types/entry.type';
import { X } from '@repo/shadcn/lucide';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { useEffect, useState } from 'react';

interface RelationPickerProps {
  tenantId: string;
  relatedType: string;
  displayField?: string;
  value: string | string[];
  multiple?: boolean;
  onChange: (value: string | string[]) => void;
}

function displayLabel(entry: Entry, displayField?: string): string {
  if (displayField) return String(entry.fields?.[displayField] || '');
  return String(entry.fields?.title || entry.fields?.name || entry.id);
}

export default function RelationPicker({
  tenantId,
  relatedType,
  displayField,
  value,
  multiple,
  onChange,
}: RelationPickerProps) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    getEntries(tenantId)
      .then((all) =>
        setEntries(all.filter((e) => e.content_type_slug === relatedType)),
      )
      .catch(console.error);
  }, [tenantId, relatedType]);

  const selectedIds = multiple ? (value as string[]) : [];

  const addEntry = (id: string) => {
    if (multiple) {
      onChange([...selectedIds, id]);
    } else {
      onChange(id);
    }
  };

  const removeEntry = (id: string) => {
    if (multiple) {
      onChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  const available = entries.filter(
    (e) => !selectedIds.includes(e.id) || !multiple,
  );

  return (
    <div className="space-y-2">
      {multiple && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const entry = entries.find((e) => e.id === id);
            return (
              <div
                key={id}
                className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
              >
                <span>{entry ? displayLabel(entry, displayField) : id}</span>
                <button
                  type="button"
                  onClick={() => removeEntry(id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Select
        value={multiple ? '_add' : (value as string) || '_none'}
        onValueChange={(val) => {
          if (val !== '_none' && val !== '_add') addEntry(val);
        }}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              multiple ? 'Add related entry...' : `Select ${relatedType}...`
            }
          />
        </SelectTrigger>
        <SelectContent>
          {(multiple ? available : entries).map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {displayLabel(entry, displayField)}
            </SelectItem>
          ))}
          {entries.length === 0 && (
            <SelectItem value="_none" disabled>
              No entries found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
