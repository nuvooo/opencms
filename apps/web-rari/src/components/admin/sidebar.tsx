'use client';

import { signOut } from '@/actions/auth';
import { getIcon } from '@/lib/icons';
import type { PluginNavItem } from '@/lib/plugins';
import { Button } from '@repo/shadcn/button';
import { cn } from '@repo/shadcn/lib/utils';
import { usePathname } from 'rari/router';

interface AdminSidebarProps {
  navItems: PluginNavItem[];
  email: string | null;
}

export default function AdminSidebar({ navItems, email }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/sign-in';
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex h-14 items-center border-b px-6 font-semibold tracking-tight">
        CMS Admin
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {getIcon(item.icon)}
            {item.label}
          </a>
        ))}
      </nav>
      <div className="border-t p-4">
        {email && (
          <p
            className="mb-2 truncate text-xs text-muted-foreground"
            title={email}
          >
            {email}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
