import { getTenants } from '@/server/tenant.server';
import TenantsTable from './tenants-table';

const Page = async () => {
  const tenants = await getTenants();
  return <TenantsTable tenants={tenants} />;
};

export default Page;
