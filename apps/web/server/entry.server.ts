'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import { Entry, GetEntriesSchema, GetEntrySchema } from '@/types/entry.type';
import { authHeaders } from './auth-headers';

export const getEntries = async (
  tenantId: string,
  filters?: {
    locale_group_id?: string;
    content_type_slug?: string;
    locale?: string;
    status?: string;
  },
): Promise<Entry[]> => {
  const session = await auth();
  const params = new URLSearchParams();
  if (filters?.locale_group_id)
    params.set('locale_group_id', filters.locale_group_id);
  if (filters?.content_type_slug)
    params.set('content_type_slug', filters.content_type_slug);
  if (filters?.locale) params.set('locale', filters.locale);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  const [error, data] = await safeFetch(
    GetEntriesSchema,
    `/entries${qs ? `?${qs}` : ''}`,
    {
      cache: 'no-store',
      headers: authHeaders(session, { tenantId }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const getEntry = async (
  tenantId: string,
  id: string,
): Promise<Entry> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetEntrySchema, `/entries/${id}`, {
    cache: 'no-store',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const createEntry = async (
  tenantId: string,
  input: Partial<Entry>,
): Promise<Entry> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetEntrySchema, '/entries', {
    method: 'POST',
    headers: authHeaders(session, { tenantId, json: true }),
    body: JSON.stringify(input),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const updateEntry = async (
  tenantId: string,
  id: string,
  input: Partial<Entry>,
): Promise<Entry> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetEntrySchema, `/entries/${id}`, {
    method: 'PUT',
    headers: authHeaders(session, { tenantId, json: true }),
    body: JSON.stringify(input),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const deleteEntry = async (
  tenantId: string,
  id: string,
): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/entries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
};
