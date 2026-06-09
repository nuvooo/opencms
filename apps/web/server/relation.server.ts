'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import { z } from 'zod';

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
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
      headers: {
        Authorization: `Bearer ${session?.user?.tokens.access_token}`,
        'x-tenant-id': tenantId,
      },
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
