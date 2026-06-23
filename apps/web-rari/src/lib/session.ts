import { cookies } from 'rari/headers';
import { z } from 'zod';
import { env } from './env';

export const SESSION_COOKIE = 'cms-session';

/**
 * Token bundle issued by the NestJS auth endpoints. Same shape the Next.js app
 * kept inside the NextAuth session.
 */
export const TokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  session_token: z.string().optional(),
  session_refresh_time: z.union([z.string(), z.number()]).optional(),
});

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().optional(),
  role: z.string().optional(),
  isEmailVerified: z.boolean().optional(),
});

export const SessionSchema = z.object({
  user: SessionUserSchema,
  tokens: TokensSchema,
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Reads and validates the session from the httpOnly cookie. Works in server
 * components and server actions (rari's `cookies()` contract). Returns null when
 * absent or malformed.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = SessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Persists the session in an httpOnly cookie. */
export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.AUTH_SESSION_AGE,
  });
}

/** Clears the session cookie. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
