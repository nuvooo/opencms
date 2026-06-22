import SignInForm from '@/components/auth/form/sign-in.form';
import { getSetupStatus } from '@/server/setup.server';
import { redirect } from 'next/navigation';

const Page = async () => {
  const status = await getSetupStatus();

  if (!status.initialized) {
    redirect('/setup');
  }

  return (
    <div className="min-h-dvh flex justify-center items-center container">
      <SignInForm />
    </div>
  );
};

export default Page;
