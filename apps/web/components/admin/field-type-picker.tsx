'use client';

import { Button } from '@repo/shadcn/button';
import { cn } from '@repo/shadcn/lib/utils';
import type { LucideIcon } from '@repo/shadcn/lucide';
import {
  AlignLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Braces,
  Calendar,
  CalendarClock,
  Clock,
  FileText,
  Globe,
  Hash,
  Image,
  Link2,
  List,
  Mail,
  Palette,
  Phone,
  Rows,
  ToggleLeft,
  Type,
} from '@repo/shadcn/lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/shadcn/popover';
import { useState } from 'react';

interface FieldTypeOption {
  type: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

const fieldTypeOptions: FieldTypeOption[] = [
  { type: 'text', label: 'Text', icon: Type, group: 'Text' },
  { type: 'textarea', label: 'Textarea', icon: AlignLeft, group: 'Text' },
  { type: 'rich_text', label: 'Rich Text', icon: FileText, group: 'Text' },
  { type: 'slug', label: 'Slug', icon: Link2, group: 'Text' },
  { type: 'email', label: 'Email', icon: Mail, group: 'Text' },
  { type: 'url', label: 'URL', icon: Globe, group: 'Text' },
  { type: 'phone', label: 'Phone', icon: Phone, group: 'Text' },

  { type: 'number', label: 'Number', icon: Hash, group: 'Number' },
  { type: 'boolean', label: 'Boolean', icon: ToggleLeft, group: 'Number' },

  { type: 'date', label: 'Date', icon: Calendar, group: 'Date & Time' },
  {
    type: 'datetime',
    label: 'Date Time',
    icon: CalendarClock,
    group: 'Date & Time',
  },
  { type: 'time', label: 'Time', icon: Clock, group: 'Date & Time' },

  { type: 'image', label: 'Image', icon: Image, group: 'Media' },
  { type: 'color', label: 'Color', icon: Palette, group: 'Media' },

  { type: 'select', label: 'Select', icon: List, group: 'Structured' },
  { type: 'json', label: 'JSON', icon: Braces, group: 'Structured' },
  { type: 'repeater', label: 'Repeater', icon: Rows, group: 'Structured' },

  { type: 'm2o', label: 'M2O', icon: ArrowRight, group: 'Relationships' },
  { type: 'o2m', label: 'O2M', icon: ArrowLeft, group: 'Relationships' },
  { type: 'm2m', label: 'M2M', icon: ArrowLeftRight, group: 'Relationships' },
];

const groups = [
  { key: 'Text', label: 'Text' },
  { key: 'Number', label: 'Number' },
  { key: 'Date & Time', label: 'Date & Time' },
  { key: 'Media', label: 'Media' },
  { key: 'Structured', label: 'Structured' },
  { key: 'Relationships', label: 'Relationships' },
];

interface FieldTypePickerProps {
  value: string;
  onChange: (type: string) => void;
}

export default function FieldTypePicker({
  value,
  onChange,
}: FieldTypePickerProps) {
  const [open, setOpen] = useState(false);

  const current = fieldTypeOptions.find((o) => o.type === value);
  const Icon = current?.icon || Type;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-start gap-2 font-normal"
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span>{current?.label || value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {groups.map((group) => {
            const items = fieldTypeOptions.filter((o) => o.group === group.key);
            return (
              <div key={group.key}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((item) => {
                    const ItemIcon = item.icon;
                    const selected = value === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          onChange(item.type);
                          setOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                          selected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted text-foreground',
                        )}
                      >
                        <ItemIcon className="size-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
