import SetupWizard from '@/components/setup/setup-wizard';
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const SetupPage = async () => {
  const status = await getSetupStatus();

  if (status.initialized) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12 sm:py-20">
      <SetupWizard />
    </div>
  );
};

export default SetupPage;
