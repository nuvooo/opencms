'use server';

import { safeFetch } from '@/lib/api';
import { authHeaders } from '@/lib/auth-headers';
import {
  SeoSettingsResponseSchema,
  type SeoSettings,
  type SeoSettingsInput,
} from '@/lib/seo';
import { getSession } from '@/lib/session';

export async function getSeoSettings(tenantId: string): Promise<SeoSettings> {
  const session = await getSession();
  const [error, data] = await safeFetch(
    SeoSettingsResponseSchema,
    '/seo/settings',
    {
      cache: 'no-store',
      headers: authHeaders(session, { tenantId }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
}

export async function updateSeoSettings(
  tenantId: string,
  input: SeoSettingsInput,
): Promise<SeoSettings> {
  const session = await getSession();
  const [error, data] = await safeFetch(
    SeoSettingsResponseSchema,
    '/seo/settings',
    {
      method: 'PUT',
      headers: authHeaders(session, { tenantId, json: true }),
      body: JSON.stringify(input),
    },
  );
  if (error) throw new Error(error);
  return data.data;
}
