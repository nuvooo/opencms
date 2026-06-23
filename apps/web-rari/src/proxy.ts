import { SESSION_COOKIE } from '@/lib/session';
import type { RariRequest } from 'rari';
import { RariResponse } from 'rari';

/**
 * Edge middleware (rari's `proxy`). Replaces the Next.js middleware.ts auth
 * gate: any /admin route requires a session cookie, otherwise the visitor is
 * redirected to the sign-in page. Authenticated visitors hitting the sign-in
 * page are sent on to the admin dashboard.
 */
export function proxy(request: RariRequest) {
  const { pathname } = request.rariUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE));

  if (pathname === '/') {
    return RariResponse.redirect(new URL('/admin', request.url));
  }

  if (pathname.startsWith('/admin') && !hasSession) {
    return RariResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  if (pathname.startsWith('/auth/sign-in') && hasSession) {
    return RariResponse.redirect(new URL('/admin', request.url));
  }

  return RariResponse.next();
}
