'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import {
  GetLocaleSchema,
  GetLocalesSchema,
  type Locale,
} from '@/types/locale.type';

export const getLocales = async (tenantId: string): Promise<Locale[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetLocalesSchema, '/locales', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
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
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
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
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
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
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
  });
  if (error) throw new Error(error);
};
