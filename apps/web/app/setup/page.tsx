import SetupWizard from '@/components/setup/setup-wizard';
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const SetupPage = async () => {
  const status = await getSetupStatus();

  if (status.initialized) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="container py-10">
      <SetupWizard />
    </div>
  );
};

export default SetupPage;
