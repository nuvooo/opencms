import type { ZodSchema, z } from 'zod';
import { env } from './env';

/**
 * Fetch from the NestJS API and validate the response with a Zod schema.
 * Port of apps/web/lib/safeFetch.ts: returns a `[error, data]` tuple so callers
 * degrade gracefully instead of throwing on network failures.
 */
export async function safeFetch<T extends ZodSchema<unknown>>(
  schema: T,
  path: string,
  init?: RequestInit,
): Promise<[string | null, z.infer<T>]> {
  let response: Response;
  let body: unknown;

  try {
    response = await fetch(`${env.API_URL}${path}`, init);
    body = await response.json();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach API';
    return [message, null as z.infer<T>];
  }

  if (!response.ok) {
    const message = (body as { message?: string })?.message ?? null;
    return [message, null as z.infer<T>];
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return [`Validation error: ${parsed.error.message}`, null as z.infer<T>];
  }

  return [null, parsed.data];
}
