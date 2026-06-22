'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import { z } from 'zod';
import { authHeaders } from './auth-headers';

const GetRelationsSchema = z.object({
  data: z.array(
    z.object({
      related_entry_id: z.string(),
      sort_order: z.number(),
      display: z.string().nullable().optional(),
    }),
  ),
});

export const setRelations = async (
  tenantId: string,
  entryId: string,
  fieldName: string,
  relatedEntryIds: string[],
) => {
  const session = await auth();
  const [error] = await safeFetch(
    DefaultReturnSchema,
    `/relations/${entryId}`,
    {
      method: 'POST',
      headers: authHeaders(session, { tenantId, json: true }),
      body: JSON.stringify({ fieldName, relatedEntryIds }),
    },
  );
  if (error) throw new Error(error);
};

export const getRelations = async (
  tenantId: string,
  entryId: string,
  fieldName: string,
) => {
  const session = await auth();
  const [error, data] = await safeFetch(
    GetRelationsSchema,
    `/relations/${entryId}/${fieldName}`,
    {
      cache: 'no-store',
      headers: authHeaders(session, { tenantId }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
