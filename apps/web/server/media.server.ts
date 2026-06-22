'use server';

import { auth } from '@/auth';
import { env } from '@/lib/env';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import { GetMediaSchema, Media } from '@/types/media.type';

export const getMedia = async (tenantId: string): Promise<Media[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetMediaSchema, '/media', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
  });
  if (error) throw new Error(error);
  return data.data;
};

export const uploadMedia = async (
  tenantId: string,
  formData: FormData,
): Promise<Media> => {
  const session = await auth();
  const response = await fetch(`${env.API_URL}/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
    body: formData,
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.message);
  return res.data;
};

export const deleteMedia = async (
  tenantId: string,
  id: string,
): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/media/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
      'x-tenant-id': tenantId,
    },
  });
  if (error) throw new Error(error);
};
