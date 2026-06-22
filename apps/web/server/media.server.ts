'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import {
  GetMediaSchema,
  GetSingleMediaSchema,
  Media,
} from '@/types/media.type';
import { authHeaders } from './auth-headers';

export const getMedia = async (tenantId: string): Promise<Media[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetMediaSchema, '/media', {
    cache: 'no-store',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const uploadMedia = async (
  tenantId: string,
  formData: FormData,
): Promise<Media> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetSingleMediaSchema, '/media/upload', {
    method: 'POST',
    headers: authHeaders(session, { tenantId }),
    body: formData,
    cache: 'no-store',
  });
  if (error || !data) throw new Error(error ?? 'Failed to upload media');
  return data.data;
};

export const deleteMedia = async (
  tenantId: string,
  id: string,
): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/media/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session, { tenantId }),
  });
  if (error) throw new Error(error);
};
