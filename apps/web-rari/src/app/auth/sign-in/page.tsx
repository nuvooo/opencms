import SignInForm from '@/components/auth/sign-in-form';
import type { Metadata } from 'rari';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignInForm />
    </main>
  );
}

export const metadata: Metadata = {
  title: 'Sign in | OpenCMS',
};
