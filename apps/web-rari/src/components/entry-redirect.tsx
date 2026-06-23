'use client';

import { getSessionUser } from '@/actions/auth';
import { useEffect } from 'react';

/** Routes the index "/" to the admin shell or the sign-in page by session. */
export default function EntryRedirect() {
  useEffect(() => {
    getSessionUser()
      .then((user) => {
        window.location.replace(user ? '/admin' : '/auth/sign-in');
      })
      .catch(() => window.location.replace('/auth/sign-in'));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
