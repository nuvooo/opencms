'use server';

import { auth } from '@/auth';
import { safeFetch } from '@/lib/safeFetch';
import { DefaultReturnSchema } from '@/types/default.type';
import { GetTenantSchema, GetTenantsSchema, Tenant } from '@/types/tenant.type';

export const getTenants = async (): Promise<Tenant[]> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetTenantsSchema, '/tenants', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
  });
  if (error) throw new Error(error);
  return data.data;
};

export const getTenant = async (id: string): Promise<Tenant> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetTenantSchema, `/tenants/${id}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
  });
  if (error) throw new Error(error);
  return data.data;
};

export const createTenant = async (
  input: Pick<Tenant, 'name' | 'slug' | 'domain' | 'locales'>,
): Promise<Tenant> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetTenantSchema, '/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    body: JSON.stringify(input),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const updateTenant = async (
  id: string,
  input: Pick<Tenant, 'name' | 'slug' | 'domain' | 'locales'>,
): Promise<Tenant> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetTenantSchema, `/tenants/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    body: JSON.stringify(input),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const setTemplateTenant = async (id: string): Promise<Tenant> => {
  const session = await auth();
  const [error, data] = await safeFetch(GetTenantSchema, `/tenants/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
    body: JSON.stringify({ isTemplate: true }),
  });
  if (error) throw new Error(error);
  return data.data;
};

export const deleteTenant = async (id: string): Promise<void> => {
  const session = await auth();
  const [error] = await safeFetch(DefaultReturnSchema, `/tenants/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session?.user?.tokens.access_token}`,
    },
  });
  if (error) throw new Error(error);
};
