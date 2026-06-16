import { cn } from '@repo/shadcn/lib/utils';
import { ModeSwitcher } from '@repo/shadcn/mode-switcher';
import { ReactNode } from 'react';

type TopBarProps = {
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
};

const TopBar = ({ start, end, className }: TopBarProps) => {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6',
        className,
      )}
    >
      {start}
      <div className="ml-auto flex items-center gap-2">
        {end}
        <ModeSwitcher />
      </div>
    </header>
  );
};

export default TopBar;
