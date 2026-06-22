'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { z } from 'zod';
import { authHeaders } from './auth-headers';
import {
  GetPluginsSchema,
  PluginDescriptorSchema,
  type PluginDescriptor,
} from './plugin.schema';

export const getPlugins = async (): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetPluginsSchema, '/plugins', {
    cache: 'no-store',
    headers: authHeaders(session),
  });
  if (error) throw new Error(error);
  return data.data;
};

const PluginsResponseSchema = z.object({
  data: z.array(PluginDescriptorSchema),
});

export const installPlugin = async (
  formData: FormData,
): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    '/plugins/install',
    {
      method: 'POST',
      body: formData,
      headers: authHeaders(session),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const rescanPlugins = async (): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    '/plugins/rescan',
    {
      method: 'POST',
      headers: authHeaders(session),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const togglePlugin = async (
  id: string,
  enabled: boolean,
): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    `/plugins/${id}`,
    {
      method: 'PATCH',
      headers: authHeaders(session, { json: true }),
      body: JSON.stringify({ enabled }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};

export const uninstallPlugin = async (
  id: string,
): Promise<PluginDescriptor[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    `/plugins/${id}`,
    {
      method: 'DELETE',
      headers: authHeaders(session),
    },
  );
  if (error) throw new Error(error);
  return data.data;
};
