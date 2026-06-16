import { auth } from '@/auth';
import AdminSidebar from '@/components/admin-sidebar';
import PluginLoader from '@/components/admin/plugin-loader';
import TenantTabs from '@/components/admin/tenant-tabs';
import TopBar from '@/components/top-bar';
import { PluginProvider } from '@/lib/plugin/registry';
import { redirect } from 'next/navigation';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth();
  if (!session) redirect('/auth/sign-in');

  const user = session.user?.profile
    ? {
        name: session.user.profile.name,
        email: session.user.email,
        username: session.user.username,
        avatar: session.user.profile.profilePicture || null,
      }
    : undefined;

  return (
    <PluginProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar user={user} />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <TopBar className="hidden lg:flex" />
          <TenantTabs />
          <div className="p-6">{children}</div>
        </main>
      </div>
      <PluginLoader />
    </PluginProvider>
  );
};

export default AdminLayout;
