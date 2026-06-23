import type { Session } from './session';

/**
 * Standard auth headers for API calls. Port of apps/web/server/auth-headers.ts.
 */
export function authHeaders(
  session: Session | null,
  opts?: { tenantId?: string; json?: boolean },
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.tokens.access_token ?? ''}`,
  };
  if (opts?.tenantId !== undefined) headers['x-tenant-id'] = opts.tenantId;
  if (opts?.json) headers['Content-Type'] = 'application/json';
  return headers;
}
