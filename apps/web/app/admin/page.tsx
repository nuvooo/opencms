import { auth } from '@/auth';
import DashboardStats from '@/components/admin/dashboard-stats';
import { getPlugins } from '@/server/plugin.server';
import { getTenants } from '@/server/tenant.server';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Building2 } from '@repo/shadcn/lucide';

const Page = async () => {
  const session = await auth();
  const plugins = await getPlugins();
  const tenantsPlugin = plugins.find((p) => p.id === 'tenants');
  const multiTenant = tenantsPlugin?.enabled ?? false;

  let tenantCount = 0;
  try {
    const tenants = await getTenants();
    tenantCount = tenants.length;
  } catch {
    // API might not be available
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.profile?.name || 'User'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your CMS.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {multiTenant && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tenants
              </CardTitle>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenantCount}</div>
            </CardContent>
          </Card>
        )}
        <DashboardStats />
      </div>
    </div>
  );
};

export default Page;
