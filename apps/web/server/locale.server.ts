'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import {
  GetLocaleSchema,
  GetLocalesSchema,
  type Locale,
} from '@/types/locale.type';
import { authHeaders } from './auth-headers';

export const getLocales = async (tenantId: string): Promise<Locale[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetLocalesSchema, '/locales', {
    cache: 'no-store',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const createLocale = async (
  tenantId: string,
  body: { code: string; name: string; is_default?: boolean },
): Promise<Locale> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetLocaleSchema, '/locales', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(session, { tenantId, json: true }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const updateLocale = async (
  tenantId: string,
  id: string,
  body: Partial<{ code: string; name: string; is_default: boolean }>,
): Promise<Locale> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetLocaleSchema, `/locales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: authHeaders(session, { tenantId, json: true }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const deleteLocale = async (
  tenantId: string,
  id: string,
): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/locales/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
};
