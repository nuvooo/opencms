'use client';

/**
 * Local client boundary around the shared shadcn Toaster.
 *
 * rari only treats `'use client'` files inside this app as client components;
 * it does not parse the directive inside external/workspace packages. Importing
 * `@repo/shadcn/sonner` straight into a server component therefore makes the
 * rari server runtime try to load `next-themes`/`sonner` and fail. Re-exporting
 * it from this local client module turns it into a proper client reference.
 */
export { Toaster } from '@repo/shadcn/sonner';
