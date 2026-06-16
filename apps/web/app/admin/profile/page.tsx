import { auth } from '@/auth';
import AppearanceSettings from '@/components/profile/appearance-settings';
import GeneralSettings from '@/components/profile/general-settings';
import ProfileAvatarEditor from '@/components/profile/profile-avatar-editor';
import SecuritySettings from '@/components/profile/security-settings';
import SessionsSettings from '@/components/profile/sessions-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/shadcn/tabs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const Page = async () => {
  const session = await auth();
  if (!session?.user) redirect('/auth/sign-in');

  const select_font =
    (await cookies()).get('select-font')?.value ?? '--font-geist';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <ProfileAvatarEditor />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {session.user.profile?.name || session.user.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security and Login</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsSettings />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSettings select_font={select_font} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Page;
