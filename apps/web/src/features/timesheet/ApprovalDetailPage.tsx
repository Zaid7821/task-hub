import { SystemRole, TimesheetStatus } from '@aionos/shared';
import { ArrowLeftIcon, CheckIcon, FileQuestionIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { useTimesheet, useTimesheetMutations } from '@/api/timesheets';
import { useCurrentUser } from '@/auth/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, formatWeekRange } from '@/lib/dates';
import { TimesheetGrid } from './TimesheetGrid';
import { TimesheetStatusBadge } from './TimesheetStatusBadge';

const BackLink = () => (
  <Button asChild variant="ghost" size="sm" className="-ml-2">
    <Link to="/timesheet/approvals">
      <ArrowLeftIcon /> All approvals
    </Link>
  </Button>
);

export function ApprovalDetailPage() {
  const { sheetId } = useParams();
  const user = useCurrentUser();
  const sheet = useTimesheet(sheetId);
  const { approve, reject } = useTimesheetMutations();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (sheet.isPending) return <Skeleton className="h-80 w-full" />;
  if (sheet.isError) {
    return sheet.error instanceof ApiError && sheet.error.isNotFound ? (
      <EmptyState icon={FileQuestionIcon} title="Timesheet not found" action={<BackLink />} />
    ) : (
      <ErrorState
        title="Could not load the timesheet"
        error={sheet.error}
        onRetry={() => void sheet.refetch()}
      />
    );
  }

  const week = sheet.data;
  const isDecider =
    week.status === TimesheetStatus.SUBMITTED &&
    (week.approver?.id === user.id || user.systemRole === SystemRole.SUPER_ADMIN);
  const id = week.id ?? '';

  const doReject = () => {
    reject.mutate(
      { id, note: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Timesheet returned to ${week.owner.displayName}`);
          setRejectOpen(false);
          setReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar user={week.owner} />
        <div>
          <h2 className="text-base font-semibold">{week.owner.displayName}</h2>
          <p className="text-sm text-muted-foreground">
            Week of {formatWeekRange(week.weekStart)} · {week.totalHours} h
            {week.submittedAt && ` · submitted ${formatDateTime(week.submittedAt)}`}
          </p>
        </div>
        <TimesheetStatusBadge status={week.status} />
        {isDecider && (
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(true)}
              disabled={approve.isPending}
            >
              <XIcon /> Reject
            </Button>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(
                  { id },
                  { onSuccess: () => toast.success(`Approved ${week.owner.displayName}'s week`) },
                )
              }
            >
              {approve.isPending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Approve
            </Button>
          </div>
        )}
      </div>
      {week.decisionNote && (
        <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">Note:</span> {week.decisionNote}
        </p>
      )}

      <TimesheetGrid week={week} editable={false} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this timesheet?</DialogTitle>
            <DialogDescription>
              {week.owner.displayName} will be notified with your reason and can fix and resubmit
              the week.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <FieldLabel htmlFor="reject-reason">Reason</FieldLabel>
            <Textarea
              id="reject-reason"
              autoFocus
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tuesday is missing the client workshop hours."
            />
            {reject.isError && <FieldError>{reject.error.message}</FieldError>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={doReject}
              disabled={reason.trim().length < 3 || reject.isPending}
            >
              {reject.isPending && <Loader2Icon className="animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
