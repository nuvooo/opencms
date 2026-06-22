import type { Session } from 'next-auth';

/**
 * Builds the standard auth headers for API server actions.
 * Pass the already-resolved session to avoid calling auth() twice.
 */
export function authHeaders(
  session: Session | null,
  opts?: { tenantId?: string; json?: boolean },
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.user?.tokens.access_token}`,
  };
  if (opts?.tenantId !== undefined) headers['x-tenant-id'] = opts.tenantId;
  if (opts?.json) headers['Content-Type'] = 'application/json';
  return headers;
}
