import { TimesheetStatus } from '@aionos/shared';
import { InboxIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useApprovals } from '@/api/timesheets';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseEnumParam, useUrlParams } from '@/hooks/use-url-params';
import { formatDateTime, formatWeekRange } from '@/lib/dates';
import { timesheetStatusLabel } from '@/lib/labels';
import { TimesheetStatusBadge } from './TimesheetStatusBadge';

const FILTERS = [TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED, TimesheetStatus.REJECTED];

export function ApprovalsPage() {
  const { params, update } = useUrlParams<'status'>();
  const status = parseEnumParam(TimesheetStatus, params.get('status')) ?? TimesheetStatus.SUBMITTED;
  const approvals = useApprovals(status);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === status ? 'secondary' : 'ghost'}
            aria-pressed={s === status}
            onClick={() => update({ status: s === TimesheetStatus.SUBMITTED ? null : s })}
          >
            {timesheetStatusLabel[s]}
          </Button>
        ))}
      </div>

      {approvals.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : approvals.isError ? (
        <ErrorState
          title="Could not load approvals"
          error={approvals.error}
          onRetry={() => void approvals.refetch()}
        />
      ) : approvals.data.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={
            status === TimesheetStatus.SUBMITTED
              ? 'Nothing waiting for your approval'
              : 'No timesheets here'
          }
          description="Timesheets from people who report to you appear here when they submit a week."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[620px]" aria-label="Timesheets">
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.data.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => void navigate(`/timesheet/approvals/${s.id}`)}
                >
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <UserAvatar user={s.owner} size="sm" />
                      <Link
                        to={`/timesheet/approvals/${s.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.owner.displayName}
                      </Link>
                    </span>
                  </TableCell>
                  <TableCell>{formatWeekRange(s.weekStart)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.totalHours} h</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.submittedAt ? formatDateTime(s.submittedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <TimesheetStatusBadge status={s.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
