import type { DirectorySyncRunDto } from '@aionos/shared';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  RefreshCwIcon,
  UserCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDirectorySyncStatus, useRunDirectorySync } from '@/api/directory-sync';
import { ErrorState } from '@/components/common/ErrorState';
import { StatTile, StatTileSkeleton } from '@/components/common/StatTile';
import { toneBadgeClass } from '@/components/common/tones';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, timeAgo } from '@/lib/dates';

function RunSummary({ run }: { run: DirectorySyncRunDto }) {
  const failed = run.outcome === 'FAILED';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge
          variant="outline"
          className={failed ? toneBadgeClass.danger : toneBadgeClass.success}
        >
          {failed ? (
            <CircleAlertIcon className="size-3.5" aria-hidden />
          ) : (
            <CircleCheckIcon className="size-3.5" aria-hidden />
          )}
          {failed ? 'Failed' : 'Succeeded'}
        </Badge>
        <span className="text-muted-foreground">
          {run.trigger === 'MANUAL' ? 'Started manually' : 'Scheduled run'}
          {run.triggeredBy ? ` by ${run.triggeredBy.displayName}` : ''},{' '}
          <time dateTime={run.finishedAt} title={formatDateTime(run.finishedAt)}>
            {timeAgo(run.finishedAt)}
          </time>
        </span>
      </div>

      {failed ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {run.error ?? 'The sync failed.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Read from Entra"
            value={run.fetched}
            icon={UsersIcon}
            hint="Member accounts"
          />
          <StatTile
            label="New people"
            value={run.created}
            icon={UserPlusIcon}
            hint={`${run.departmentsCreated} new ${run.departmentsCreated === 1 ? 'department' : 'departments'}`}
          />
          <StatTile
            label="Updated"
            value={run.updated}
            icon={UserCheckIcon}
            hint={`${run.unchanged} unchanged`}
          />
          <StatTile
            label="Deactivated"
            value={run.deactivated}
            icon={UserMinusIcon}
            hint={`${run.reactivated} reactivated`}
          />
        </div>
      )}

      {run.skippedCount > 0 && (
        <Card className="gap-2 p-4">
          <p className="text-sm font-medium">
            {run.skippedCount} {run.skippedCount === 1 ? 'account needs' : 'accounts need'}{' '}
            attention
          </p>
          <ul className="space-y-1 text-sm">
            {run.skipped.map((s) => (
              <li key={`${s.email}-${s.reason}`} className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-medium break-all">{s.email}</span>
                <span className="text-muted-foreground">{s.reason}</span>
              </li>
            ))}
          </ul>
          {run.skippedCount > run.skipped.length && (
            <p className="text-xs text-muted-foreground">
              Showing the first {run.skipped.length}. The full list is in the API logs.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

export function DirectorySyncPage() {
  const status = useDirectorySyncStatus();
  const runSync = useRunDirectorySync();

  if (status.isPending) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatTileSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  if (status.isError) {
    return (
      <ErrorState
        error={status.error}
        title="Could not load the sync status"
        onRetry={() => void status.refetch()}
      />
    );
  }

  const s = status.data;
  const busy = s.running || runSync.isPending;
  const start = () =>
    runSync.mutate(undefined, {
      onSuccess: (run) =>
        toast.success(
          `Directory synced: ${run.created} new, ${run.updated} updated, ${run.deactivated} deactivated`,
        ),
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className="space-y-6">
      <Card className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-medium">Microsoft Entra ID directory</h2>
          <p className="text-sm text-muted-foreground">
            {!s.configured
              ? 'Not configured. Set GRAPH_SYNC_ENABLED and GRAPH_CLIENT_SECRET on the API (see README).'
              : s.intervalHours === 0
                ? 'Runs only when you press Sync now.'
                : `Runs every ${s.intervalHours} h${s.nextRunAt ? `, next ${formatDateTime(s.nextRunAt)}` : ''}.`}{' '}
            Names, emails, job titles, departments, managers and account status come from Entra.
            Roles are not changed.
          </p>
        </div>
        <Button onClick={start} disabled={!s.configured || busy} className="shrink-0">
          <RefreshCwIcon className={busy ? 'animate-spin' : undefined} aria-hidden />
          {busy ? 'Syncing…' : 'Sync now'}
        </Button>
      </Card>

      <section aria-labelledby="last-run" className="space-y-3">
        <h2 id="last-run" className="text-sm font-medium text-muted-foreground">
          Last run
        </h2>
        {s.lastRun ? (
          <RunSummary run={s.lastRun} />
        ) : (
          <p className="text-sm text-muted-foreground">The directory has not been synced yet.</p>
        )}
      </section>
    </div>
  );
}
