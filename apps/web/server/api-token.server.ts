'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { ApiTokenSchema, GetApiTokensSchema } from '@/types/api-token.type';
import { DefaultReturnSchema } from '@/types/default.type';
import { authHeaders } from './auth-headers';

export const getApiTokens = async (tenantId: string) => {
  const session = await auth();
  const [error, data] = await safeFetch(GetApiTokensSchema, '/api-tokens', {
    cache: 'no-store',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const createApiToken = async (
  tenantId: string,
  body: { name: string },
) => {
  const session = await auth();
  const [error, data] = await safeFetch(ApiTokenSchema, '/api-tokens', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(session, { tenantId, json: true }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const deleteApiToken = async (tenantId: string, id: string) => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/api-tokens/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
};
