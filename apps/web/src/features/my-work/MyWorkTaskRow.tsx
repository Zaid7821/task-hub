import type { TaskDto } from '@aionos/shared';
import { Link } from 'react-router';
import { DueDate } from '@/components/common/DueDate';
import { LabelList } from '@/components/common/LabelBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { toneBadgeClass } from '@/components/common/tones';
import { Badge } from '@/components/ui/badge';
import { isOverdue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { taskPath, type TaskRouteState } from '@/features/tasks/task-paths';

interface MyWorkTaskRowProps {
  task: TaskDto;
  /** URL to come back to when the task drawer closes (keeps My Work filters). */
  returnTo: string;
}

export function MyWorkTaskRow({ task, returnTo }: MyWorkTaskRowProps) {
  const overdue = isOverdue(task);
  const state: TaskRouteState = { returnTo };

  return (
    <li>
      <Link
        to={taskPath(task)}
        state={state}
        className={cn(
          'flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:gap-3',
          overdue && 'border-l-2 border-l-overdue',
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <TaskTypeIcon type={task.type} />
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{task.key}</span>
          <span className="truncate text-sm font-medium">{task.title}</span>
          <LabelList labels={task.labels} max={2} />
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {task.project.name}
          </span>
          <PriorityBadge priority={task.priority} />
          <DueDate dueDate={task.dueDate} status={task.status} />
          {overdue && (
            <Badge variant="outline" className={toneBadgeClass.danger}>
              Overdue
            </Badge>
          )}
        </span>
      </Link>
    </li>
  );
}
