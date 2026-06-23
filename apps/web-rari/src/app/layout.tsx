import { Toaster } from '@/components/ui/toaster';
import type { LayoutProps, Metadata } from 'rari';

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Toaster />
    </div>
  );
}

export const metadata: Metadata = {
  title: 'OpenCMS Admin (rari)',
  description: 'OpenCMS admin frontend on the rari runtime.',
};
