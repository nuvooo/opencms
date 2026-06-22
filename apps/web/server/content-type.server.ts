'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import {
  ContentType,
  GetContentTypeSchema,
  GetContentTypesSchema,
} from '@/types/content-type.type';
import { DefaultReturnSchema } from '@/types/default.type';

export const getContentTypes = async (
  tenantId: string,
): Promise<ContentType[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetContentTypesSchema,
    '/content-types',
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const getContentType = async (
  tenantId: string,
  id: string,
): Promise<ContentType> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetContentTypeSchema,
    `/content-types/${id}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const createContentType = async (
  tenantId: string,
  input: Partial<ContentType>,
): Promise<ContentType> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetContentTypeSchema,
    '/content-types',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(input),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const updateContentType = async (
  tenantId: string,
  id: string,
  input: Partial<ContentType>,
): Promise<ContentType> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetContentTypeSchema,
    `/content-types/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(input),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const deleteContentType = async (
  tenantId: string,
  id: string,
): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/content-types/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
  });
  if (error) throw new Error(error);
};
