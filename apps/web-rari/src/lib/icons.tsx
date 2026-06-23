import {
  Building2,
  FileText,
  FileType,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  Puzzle,
  Search,
  Store,
} from 'lucide-react';
import type { ReactElement } from 'react';

const iconMap: Record<string, ReactElement> = {
  LayoutDashboard: <LayoutDashboard className="size-4 shrink-0" />,
  FileText: <FileText className="size-4 shrink-0" />,
  FileType: <FileType className="size-4 shrink-0" />,
  ImageIcon: <ImageIcon className="size-4 shrink-0" />,
  Building2: <Building2 className="size-4 shrink-0" />,
  Puzzle: <Puzzle className="size-4 shrink-0" />,
  KeyRound: <KeyRound className="size-4 shrink-0" />,
  Search: <Search className="size-4 shrink-0" />,
  Store: <Store className="size-4 shrink-0" />,
};

export const getIcon = (name: string): ReactElement =>
  iconMap[name] || <Puzzle className="size-4 shrink-0" />;
