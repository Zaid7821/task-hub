import type { ProjectMemberDto } from '@aionos/shared';
import { HistoryIcon } from 'lucide-react';
import { useTaskActivity } from '@/api/tasks';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { describeActivity } from './activity-text';

interface ActivityTimelineProps {
  taskId: string;
  members: ProjectMemberDto[];
}

export function ActivityTimeline({ taskId, members }: ActivityTimelineProps) {
  const activity = useTaskActivity(taskId);
  const names = new Map(members.map((m) => [m.user.id, m.user.displayName]));
  // TODO(phase-x): the API could embed user names for assignee changes so former members resolve too.
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? 'a former member') : 'nobody');

  if (activity.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (activity.isError) {
    return (
      <ErrorState
        title="Could not load activity"
        error={activity.error}
        onRetry={() => void activity.refetch()}
      />
    );
  }
  if (activity.data.length === 0) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <HistoryIcon className="size-4" aria-hidden /> No activity yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-6" aria-label="Activity history">
      {activity.data.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute top-0.5 -left-[2.1rem] rounded-full bg-background p-0.5">
            <UserAvatar user={a.actor} size="xs" />
          </span>
          <p className="text-sm">
            <span className="font-medium">{a.actor.displayName}</span>{' '}
            <span className="text-muted-foreground">{describeActivity(a, nameOf)}</span>
          </p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={a.createdAt}
            title={formatDateTime(a.createdAt)}
          >
            {timeAgo(a.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
