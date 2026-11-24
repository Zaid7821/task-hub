import { Outlet } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { RouteTabs } from '@/components/common/RouteTabs';

export function AdminLayout() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin"
        description="Organization structure synced from Microsoft Entra ID."
      />
      <RouteTabs
        tabs={[
          { label: 'Departments', to: '/admin/departments' },
          { label: 'Teams', to: '/admin/teams' },
          { label: 'Users', to: '/admin/users' },
          { label: 'Directory sync', to: '/admin/sync' },
        ]}
      />
      <Outlet />
    </div>
  );
}
