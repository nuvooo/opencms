'use server';

import { safeFetch } from '@/lib/api';
import { authHeaders } from '@/lib/auth-headers';
import {
  MarketplaceEntrySchema,
  PluginDescriptorSchema,
  type MarketplaceEntry,
  type PluginDescriptor,
} from '@/lib/plugins';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const PluginsResponseSchema = z.object({
  data: z.array(PluginDescriptorSchema),
});

const MarketplaceResponseSchema = z.object({
  data: z.array(MarketplaceEntrySchema),
});

/** Client-callable refresh of the marketplace catalog. */
export async function listMarketplace(): Promise<MarketplaceEntry[]> {
  const session = await getSession();
  const [error, data] = await safeFetch(
    MarketplaceResponseSchema,
    '/plugins/marketplace',
    {
      cache: 'no-store',
      headers: authHeaders(session),
    },
  );
  if (error) throw new Error(error);
  return data.data;
}

export async function togglePlugin(
  id: string,
  enabled: boolean,
): Promise<PluginDescriptor[]> {
  const session = await getSession();
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
}

export async function installFromMarketplace(
  id: string,
): Promise<PluginDescriptor[]> {
  const session = await getSession();
  const [error, data] = await safeFetch(
    PluginsResponseSchema,
    '/plugins/marketplace/install',
    {
      method: 'POST',
      headers: authHeaders(session, { json: true }),
      body: JSON.stringify({ id }),
    },
  );
  if (error) throw new Error(error);
  return data.data;
}

export async function rescanPlugins(): Promise<PluginDescriptor[]> {
  const session = await getSession();
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
}
