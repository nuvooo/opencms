'use client';

import { getContentTypes } from '@/server/content-type.server';
import { getEntries } from '@/server/entry.server';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { FileText, FileType } from '@repo/shadcn/lucide';
import { useEffect, useState } from 'react';

const DashboardStats = () => {
  const [contentTypeCount, setContentTypeCount] = useState<number>(0);
  const [entryCount, setEntryCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantId = localStorage.getItem('admin-tenant-id');
    if (!tenantId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getContentTypes(tenantId)
        .then((cts) => cts.length)
        .catch(() => 0),
      getEntries(tenantId)
        .then((entries) => entries.length)
        .catch(() => 0),
    ])
      .then(([ctCount, eCount]) => {
        setContentTypeCount(ctCount);
        setEntryCount(eCount);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Content Types</CardTitle>
          <FileType className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : contentTypeCount}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Entries</CardTitle>
          <FileText className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '...' : entryCount}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default DashboardStats;
