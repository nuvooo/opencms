'use client';

import ContentTypeNav from '@/components/admin/content-type-nav';
import SignOut from '@/components/auth/sign-out';
import TenantSelector from '@/components/tenant-selector';
import { getIcon } from '@/lib/plugin/icons';
import { usePluginRegistry } from '@/lib/plugin/registry';
import { Button } from '@repo/shadcn/button';
import { cn } from '@repo/shadcn/lib/utils';
import { Menu, User } from '@repo/shadcn/lucide';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { ScrollArea } from '@repo/shadcn/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@repo/shadcn/sheet';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface AdminSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    username?: string | null;
    avatar?: string | null;
  };
}

const AdminSidebar = ({ user }: AdminSidebarProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { navItems } = usePluginRegistry();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-0.5', mobile && 'mt-6')}>
      {navItems.map((item) =>
        item.path === '/admin/entries' ? (
          <ContentTypeNav
            key={item.path}
            mobile={mobile}
            onNavClick={mobile ? () => setOpen(false) : undefined}
          />
        ) : (
          <Link
            key={item.path}
            href={item.path}
            onClick={mobile ? () => setOpen(false) : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {getIcon(item.icon)}
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center border-b px-6 font-semibold tracking-tight">
        CMS Admin
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <NavContent />
      </ScrollArea>
      <div className="border-t">
        <TenantSelector />
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 border-t">
            <Link
              href={user.username ? `/${user.username}` : '/admin'}
              className="flex flex-1 items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </Link>
            <SignOut />
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-background px-4 py-3 flex items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4 flex flex-col">
            <div className="font-semibold text-lg">CMS Admin</div>
            <NavContent mobile />
            <div className="mt-auto space-y-2">
              <TenantSelector />
              {user && (
                <div className="border-t pt-2">
                  <Link
                    href={user.username ? `/${user.username}` : '/admin'}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <User className="size-4 shrink-0" />
                    <div className="truncate min-w-0">
                      <p className="truncate">{user.name || 'User'}</p>
                      <p className="text-xs truncate text-muted-foreground/60">
                        {user.email}
                      </p>
                    </div>
                  </Link>
                  <SignOut />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
        <span className="ml-3 font-semibold">CMS Admin</span>
        <div className="ml-auto">
          <ModeSwitcher />
        </div>
      </div>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-background lg:fixed lg:inset-y-0">
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
