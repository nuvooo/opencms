import {
  Building2,
  FileText,
  FileType,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  Puzzle,
} from '@repo/shadcn/lucide';
import { ReactElement } from 'react';

const iconMap: Record<string, ReactElement> = {
  LayoutDashboard: <LayoutDashboard className="size-4 shrink-0" />,
  FileText: <FileText className="size-4 shrink-0" />,
  FileType: <FileType className="size-4 shrink-0" />,
  ImageIcon: <ImageIcon className="size-4 shrink-0" />,
  Building2: <Building2 className="size-4 shrink-0" />,
  Puzzle: <Puzzle className="size-4 shrink-0" />,
  KeyRound: <KeyRound className="size-4 shrink-0" />,
};

export const getIcon = (name: string): ReactElement =>
  iconMap[name] || <Puzzle className="size-4 shrink-0" />;
