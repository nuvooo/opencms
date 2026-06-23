'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { authHeaders } from './auth-headers';
import {
  SeoSettingsResponseSchema,
  type SeoSettings,
  type SeoSettingsInput,
} from './seo.schema';

export const getSeoSettings = async (
  tenantId: string,
): Promise<SeoSettings> => {
  const session = await auth();
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
};

export const updateSeoSettings = async (
  tenantId: string,
  input: SeoSettingsInput,
): Promise<SeoSettings> => {
  const session = await auth();
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
};
