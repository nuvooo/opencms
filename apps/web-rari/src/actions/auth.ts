'use server';

import { safeFetch } from '@/lib/api';
import { authHeaders } from '@/lib/auth-headers';
import {
  SessionUserSchema,
  TokensSchema,
  clearSession,
  getSession,
  setSession,
} from '@/lib/session';
import { z } from 'zod';

const SignInResponseSchema = z.object({
  data: SessionUserSchema.passthrough(),
  tokens: TokensSchema,
});

export interface SignInResult {
  ok: boolean;
  error?: string;
}

/**
 * Credential sign-in. Replaces the NextAuth Credentials provider: posts to the
 * NestJS `/auth/sign-in` endpoint and, on success, stores the returned user and
 * tokens in the httpOnly session cookie.
 */
export async function signIn(
  identifier: string,
  password: string,
): Promise<SignInResult> {
  const [error, data] = await safeFetch(SignInResponseSchema, '/auth/sign-in', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (error || !data) {
    return { ok: false, error: error ?? 'Invalid credentials.' };
  }

  await setSession({
    user: {
      id: data.data.id,
      email: data.data.email,
      username: data.data.username,
      role: data.data.role,
      isEmailVerified: data.data.isEmailVerified,
    },
    tokens: data.tokens,
  });

  return { ok: true };
}

/**
 * Returns the current session user, or null. Used by client components to gate
 * routes (server components cannot read request cookies in rari 0.14.12).
 */
export async function getSessionUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** Signs out: best-effort API revocation, then clears the session cookie. */
export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session?.tokens.session_token) {
    await safeFetch(z.object({}).passthrough(), '/auth/sign-out', {
      method: 'POST',
      headers: authHeaders(session, { json: true }),
      body: JSON.stringify({ session_token: session.tokens.session_token }),
    }).catch(() => undefined);
  }
  await clearSession();
}
