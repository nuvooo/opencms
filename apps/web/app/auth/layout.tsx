import TopBar from '@/components/top-bar';
import { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      {children}
    </div>
  );
};

export default AuthLayout;
