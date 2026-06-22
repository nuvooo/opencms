import { auth } from '@/auth';
import AdminSidebar from '@/components/admin-sidebar';
import PluginLoader from '@/components/admin/plugin-loader';
import PluginRouteGuard from '@/components/admin/plugin-route-guard';
import TenantInit from '@/components/admin/tenant-init';
import TopBar from '@/components/top-bar';
import { PluginProvider } from '@/lib/plugin/registry';
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const status = await getSetupStatus();
  if (!status.initialized) redirect('/setup');

  const session = await auth();
  if (!session) redirect('/auth/sign-in');

  const user = session.user?.profile
    ? {
        name: session.user.profile.name,
        email: session.user.email,
        avatar: session.user.profile.profilePicture || null,
      }
    : undefined;

  return (
    <PluginProvider>
      <TenantInit />
      <div className="min-h-screen bg-background">
        <AdminSidebar user={user} />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <TopBar className="hidden lg:flex" />
          <div className="p-6">
            <PluginRouteGuard>{children}</PluginRouteGuard>
          </div>
        </main>
      </div>
      <PluginLoader />
    </PluginProvider>
  );
};

export default AdminLayout;
