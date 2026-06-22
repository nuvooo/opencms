'use client';

import { getLocales } from '@/server/locale.server';
import type { Locale } from '@/types/locale.type';
import { cn } from '@repo/shadcn/lib/utils';
import { useEffect, useState } from 'react';

interface LocaleTabsProps {
  tenantId: string;
  value: string;
  onChange: (locale: string) => void;
}

export default function LocaleTabs({
  tenantId,
  value,
  onChange,
}: LocaleTabsProps) {
  const [locales, setLocales] = useState<Locale[]>([]);

  useEffect(() => {
    getLocales(tenantId).then(setLocales).catch(console.error);
  }, [tenantId]);

  if (locales.length <= 1) return null;

  return (
    <div className="flex gap-1 border-b mb-4">
      {locales.map((locale) => (
        <button
          key={locale.code}
          type="button"
          onClick={() => onChange(locale.code)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            value === locale.code
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {locale.name}
          {locale.is_default && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              (default)
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
