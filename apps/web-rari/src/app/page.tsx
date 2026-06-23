import type { Metadata } from 'rari';

/**
 * The root is handled by `proxy.ts`, which redirects "/" to "/admin" (and on to
 * sign-in when unauthenticated). This component is a fallback for direct render.
 */
export default function IndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <a
        href="/admin"
        className="text-primary underline-offset-4 hover:underline"
      >
        Go to admin
      </a>
    </main>
  );
}

export const metadata: Metadata = {
  title: 'OpenCMS',
};
