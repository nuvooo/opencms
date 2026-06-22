'use client';

import ComboboxSelect from '@/components/admin/combobox-select';
import { getEntries } from '@/server/entry.server';
import type { Entry } from '@/types/entry.type';
import { X } from '@repo/shadcn/lucide';
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
  const label = displayField
    ? String(entry.fields?.[displayField] || '')
    : String(entry.fields?.title || entry.fields?.name || '');
  return `#${entry.id.substring(0, 8)} ${label}`.trim();
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

  const selected = entries.filter((e) => selectedIds.includes(e.id));

  const available = entries.filter(
    (e) => !selectedIds.includes(e.id) || !multiple,
  );

  return (
    <div className="space-y-2">
      {multiple && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
            >
              <span>{displayLabel(entry, displayField)}</span>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <ComboboxSelect
        value={multiple ? '' : (value as string) || ''}
        onChange={(val) => {
          if (val) addEntry(val);
        }}
        options={
          multiple
            ? available.map((e) => ({
                value: e.id,
                label: displayLabel(e, displayField),
              }))
            : entries.map((e) => ({
                value: e.id,
                label: displayLabel(e, displayField),
              }))
        }
        placeholder={
          entries.length === 0
            ? 'No entries found'
            : multiple
              ? 'Add related entry...'
              : `Select ${relatedType}...`
        }
        searchPlaceholder="Search entries..."
        emptyText="No entries found."
      />
    </div>
  );
}
