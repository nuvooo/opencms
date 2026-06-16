import TenantTabs from '@/components/admin/tenant-tabs';
import { ReactNode } from 'react';

const EntriesLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <TenantTabs />
      {children}
    </>
  );
};

export default EntriesLayout;
