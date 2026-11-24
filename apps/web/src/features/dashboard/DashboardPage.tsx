import { CheckCircle2Icon, ClockIcon, GaugeIcon, TargetIcon } from 'lucide-react';
import { useMyStats } from '@/api/dashboard';
import { useCurrentUser } from '@/auth/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile, StatTileSkeleton } from '@/components/common/StatTile';
import { toneBadgeClass } from '@/components/common/tones';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { mocksEnabled } from '@/env';
import { formatDate } from '@/lib/dates';
import { WeeklyHoursChart } from './WeeklyHoursChart';

// TODO(phase-x): project summary (getProjectSummary) and team contribution
// (getEmployeeContribution) views for managers and department heads.
export function DashboardPage() {
  const user = useCurrentUser();
  const stats = useMyStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          stats.data
            ? `Your contribution from ${formatDate(stats.data.from)} to ${formatDate(stats.data.to)}.`
            : `Your contribution, ${user.displayName.split(' ')[0] ?? ''}.`
        }
        actions={
          // The mock handler returns illustrative numbers; the real API aggregates actual work.
          mocksEnabled ? (
            <Badge variant="outline" className={toneBadgeClass.warning}>
              Sample data
            </Badge>
          ) : undefined
        }
      />

      {stats.isPending ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatTileSkeleton key={i} />
            ))}
          </div>
          <Card className="p-4">
            <Skeleton className="h-64 w-full" />
          </Card>
        </>
      ) : stats.isError ? (
        <ErrorState
          title="Could not load your stats"
          error={stats.error}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <>
          <section aria-label="My stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Tasks done"
              value={stats.data.tasksDone}
              hint={`Last ${stats.data.weekly.length} weeks`}
              icon={CheckCircle2Icon}
            />
            <StatTile
              label="Points delivered"
              value={stats.data.pointsDelivered}
              hint="Story points on completed tasks"
              icon={TargetIcon}
            />
            <StatTile
              label="Hours logged"
              value={`${stats.data.hoursLogged} h`}
              hint={`≈ ${Math.round(stats.data.hoursLogged / stats.data.weekly.length)} h per week`}
              icon={ClockIcon}
            />
            <StatTile
              label="On-time rate"
              value={stats.data.onTimeRate === null ? '—' : `${stats.data.onTimeRate}%`}
              hint="Done on or before the due date"
              icon={GaugeIcon}
            />
          </section>
          <WeeklyHoursChart weekly={stats.data.weekly} />
        </>
      )}
    </div>
  );
}
