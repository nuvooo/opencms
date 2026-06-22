'use server';

import { safeAction, safeFetch } from '@/lib';
import { DefaultReturnSchema } from '@/types/default.type';
import {
  BootstrapSetupInputSchema,
  SetupStatusSchema,
  ValidateDbInputSchema,
  ValidateDbResponseSchema,
} from './setup.schema';

export const getSetupStatus = async () => {
  const [error, data] = await safeFetch(SetupStatusSchema, '/setup/status', {
    cache: 'no-store',
  });

  if (error || !data) throw new Error(error ?? 'Failed to fetch setup status');
  return data;
};

export const validateSetupDb = safeAction
  .schema(ValidateDbInputSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(
      ValidateDbResponseSchema,
      '/setup/validate-db',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
        cache: 'no-store',
      },
    );

    if (error) throw new Error(error);
    return { ok: true };
  });

export const bootstrapSetup = safeAction
  .schema(BootstrapSetupInputSchema)
  .action(async ({ parsedInput }) => {
    const [error, data] = await safeFetch(
      DefaultReturnSchema,
      '/setup/bootstrap',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(parsedInput),
        cache: 'no-store',
      },
    );

    if (error || !data) throw new Error(error ?? 'Setup bootstrap failed');
    return data;
  });
