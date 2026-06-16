import TopBar from '@/components/top-bar';
import { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative min-h-dvh bg-background">
      {/* Aus dem Fluss genommen, damit die zentrierten Auth-Formulare nicht
          verschoben werden — nur der Umschalter schwebt oben rechts. */}
      <TopBar className="absolute inset-x-0 top-0 border-transparent bg-transparent backdrop-blur-none" />
      {children}
    </div>
  );
};

export default AuthLayout;
