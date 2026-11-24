import { TimesheetStatus } from '@aionos/shared';
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, SendIcon, XCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMyTimesheet, useTimesheetMutations } from '@/api/timesheets';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUrlParams } from '@/hooks/use-url-params';
import { addDaysIso, formatDateTime, formatWeekRange, mondayOf } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { TimesheetGrid } from './TimesheetGrid';
import { TimesheetStatusBadge } from './TimesheetStatusBadge';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function MyTimesheetPage() {
  const { params, update } = useUrlParams<'week'>();
  const thisWeek = mondayOf();
  const raw = params.get('week');
  // Any date in the URL snaps to its Monday; future weeks fall back to this week.
  const requested = raw && ISO_DATE.test(raw) ? mondayOf(raw) : thisWeek;
  const weekStart = requested > thisWeek ? thisWeek : requested;
  const week = useMyTimesheet(weekStart);
  const { submit } = useTimesheetMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const goTo = (monday: string) => update({ week: monday === thisWeek ? null : monday });
  const data = week.data;
  const canSubmit =
    data !== undefined &&
    !data.locked &&
    data.totalHours > 0 &&
    (data.status === TimesheetStatus.DRAFT || data.status === TimesheetStatus.REJECTED);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => goTo(addDaysIso(weekStart, -7))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            disabled={weekStart >= thisWeek}
            onClick={() => goTo(addDaysIso(weekStart, 7))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <h2 className="text-base font-semibold" aria-live="polite">
          {formatWeekRange(weekStart)}
        </h2>
        {weekStart !== thisWeek && (
          <Button variant="ghost" size="sm" onClick={() => goTo(thisWeek)}>
            This week
          </Button>
        )}
        {data && <TimesheetStatusBadge status={data.status} />}
        <div className="flex items-center gap-3 sm:ml-auto">
          {data && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {data.totalHours} h total
            </span>
          )}
          {(canSubmit ||
            data?.status === TimesheetStatus.DRAFT ||
            data?.status === TimesheetStatus.REJECTED) && (
            <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit || submit.isPending}>
              <SendIcon />{' '}
              {data?.status === TimesheetStatus.REJECTED ? 'Resubmit week' : 'Submit week'}
            </Button>
          )}
        </div>
      </div>

      {data?.status === TimesheetStatus.REJECTED && (
        <Banner tone="danger" icon={XCircleIcon}>
          Rejected by {data.approver?.displayName ?? 'your approver'}
          {data.decidedAt && ` on ${formatDateTime(data.decidedAt)}`}.
          {data.decisionNote && <span className="block">Reason: {data.decisionNote}</span>}
          <span className="block">Fix your entries and resubmit.</span>
        </Banner>
      )}
      {data?.locked && (
        <Banner tone="neutral" icon={LockIcon}>
          {data.status === TimesheetStatus.APPROVED
            ? `Approved by ${data.approver?.displayName ?? 'your approver'}. This week is locked.`
            : `Submitted to ${data.approver?.displayName ?? 'your approver'}${
                data.submittedAt ? ` on ${formatDateTime(data.submittedAt)}` : ''
              }. Entries are locked while it's awaiting approval.`}
        </Banner>
      )}

      {week.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : week.isError ? (
        <ErrorState
          title="Could not load your timesheet"
          error={week.error}
          onRetry={() => void week.refetch()}
        />
      ) : (
        <div className={cn('transition-opacity', week.isPlaceholderData && 'opacity-60')}>
          <TimesheetGrid week={week.data} editable={!week.data.locked} />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Submit ${formatWeekRange(weekStart)}?`}
        description={`${data?.totalHours ?? 0} hours will be sent for approval. You won't be able to change entries in this week unless it is rejected.`}
        confirmLabel="Submit"
        onConfirm={() =>
          submit.mutate(weekStart, {
            onSuccess: (sheet) =>
              toast.success(`Week submitted to ${sheet.approver?.displayName ?? 'your approver'}`),
          })
        }
      />
    </div>
  );
}

function Banner({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'danger' | 'neutral';
  icon: typeof LockIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        tone === 'danger' ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/50',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}
