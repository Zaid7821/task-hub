import { Outlet } from 'react-router';
import { useCurrentUser } from '@/auth/auth-context';
import { PageHeader } from '@/components/common/PageHeader';
import { RouteTabs } from '@/components/common/RouteTabs';
import { canApproveTimesheets } from '@/lib/permissions';

export function TimesheetLayout() {
  const user = useCurrentUser();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Timesheet"
        description="Your hours per task for the week. Submit the week when it's complete."
      />
      {canApproveTimesheets(user) && (
        <RouteTabs
          tabs={[
            { label: 'My timesheet', to: '/timesheet' },
            { label: 'Approvals', to: '/timesheet/approvals' },
          ]}
        />
      )}
      <Outlet />
    </div>
  );
}
