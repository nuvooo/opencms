'use client';

import { getContentTypes } from '@/server/content-type.server';
import type { ContentType } from '@/types/content-type.type';
import { cn } from '@repo/shadcn/lib/utils';
import { ChevronDown, ChevronRight, FileText, Plus } from '@repo/shadcn/lucide';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ContentTypeNavProps {
  mobile?: boolean;
  onNavClick?: () => void;
}

export default function ContentTypeNav({
  mobile,
  onNavClick,
}: ContentTypeNavProps) {
  const pathname = usePathname();
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [expanded, setExpanded] = useState(false);

  const isEntriesActive =
    pathname === '/admin/entries' || pathname.startsWith('/admin/entries/');

  useEffect(() => {
    const stored = localStorage.getItem('admin-tenant-id');
    if (stored) {
      getContentTypes(stored).then(setContentTypes).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (isEntriesActive) setExpanded(true);
  }, [isEntriesActive]);

  const handleLinkClick = () => {
    onNavClick?.();
  };

  return (
    <div>
      <Link
        href="/admin/entries"
        onClick={handleLinkClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isEntriesActive && !pathname.includes('entries/')
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <FileText className="size-4 shrink-0" />
        <span className="flex-1">Entries</span>
        {contentTypes.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        )}
      </Link>

      {expanded && contentTypes.length > 0 && (
        <div
          className={cn(
            'ml-6 mt-0.5 space-y-0.5 border-l pl-2',
            mobile ? '' : '',
          )}
        >
          {contentTypes.map((ct) => {
            const isActive =
              pathname === `/admin/entries/${ct.slug}` ||
              pathname.startsWith(`/admin/entries/${ct.slug}/`);
            return (
              <div key={ct.id} className="flex items-center group">
                <Link
                  href={`/admin/entries?content_type_slug=${ct.slug}`}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors truncate',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {ct.name}
                </Link>
                <Link
                  href={`/admin/entries/create?content_type_slug=${ct.slug}`}
                  onClick={handleLinkClick}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                  title={`Create ${ct.name}`}
                >
                  <Plus className="size-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
