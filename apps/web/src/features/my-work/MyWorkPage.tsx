import { TaskPriority, TaskStatus, type TaskDto, type TaskListQuery } from '@aionos/shared';
import { addDays, format } from 'date-fns';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PartyPopperIcon,
  SearchXIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { useProjects } from '@/api/projects';
import { useTasks } from '@/api/tasks';
import { useCurrentUser } from '@/auth/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterSelect } from '@/components/common/FilterSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { SaveViewButton } from '@/components/common/SaveViewButton';
import { TASK_STATUS_TONE, toneBadgeClass } from '@/components/common/tones';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { parseEnumParam, useUrlParams } from '@/hooks/use-url-params';
import { isOverdue, todayIso } from '@/lib/dates';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { BOARD_COLUMNS } from '@/features/projects/board/board-utils';
import { MyWorkTaskRow } from './MyWorkTaskRow';

type MyWorkParam = 'project' | 'priority' | 'due';
const DUE_OPTIONS = {
  overdue: 'Overdue',
  week: 'Due within 7 days',
  month: 'Due within 30 days',
} as const;
type DueOption = keyof typeof DUE_OPTIONS;
const isDueOption = (v: string | null): v is DueOption => v !== null && v in DUE_OPTIONS;

function dueFilter(due: DueOption | undefined): Pick<TaskListQuery, 'overdue' | 'dueBefore'> {
  if (due === 'overdue') return { overdue: true };
  if (due === 'week') return { dueBefore: format(addDays(new Date(), 7), 'yyyy-MM-dd') };
  if (due === 'month') return { dueBefore: format(addDays(new Date(), 30), 'yyyy-MM-dd') };
  return {};
}

export function MyWorkPage() {
  const user = useCurrentUser();
  const location = useLocation();
  const { params, update } = useUrlParams<MyWorkParam>();
  const projects = useProjects({ mine: true, pageSize: 100, sort: 'name' });

  const projectId = params.get('project') ?? undefined;
  const priority = parseEnumParam(TaskPriority, params.get('priority'));
  const rawDue = params.get('due');
  const due = isDueOption(rawDue) ? rawDue : undefined;
  const hasFilters = Boolean(projectId || priority || due);

  // TODO(phase-x): paginate or "load more" for people with more than 100 assigned tasks.
  const tasks = useTasks({
    assigneeId: 'me',
    projectId,
    priority,
    ...dueFilter(due),
    sort: 'dueDate',
    order: 'asc',
    pageSize: 100,
  });

  const returnTo = `${location.pathname}${location.search}`;
  const all = tasks.data?.data ?? [];
  const overdueCount = all.filter(isOverdue).length;
  const today = todayIso();
  const weekAhead = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const dueSoonCount = all.filter(
    (t) =>
      t.status !== TaskStatus.DONE && t.dueDate && t.dueDate >= today && t.dueDate <= weekAhead,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Work"
        description={`Tasks assigned to ${user.displayName.split(' ')[0] ?? 'you'} across all projects.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Filter by project"
          value={projectId}
          allLabel="All projects"
          options={(projects.data?.data ?? []).map((p): [string, string] => [
            p.id,
            `${p.key} · ${p.name}`,
          ])}
          onChange={(v) => update({ project: v })}
          className="w-56"
        />
        <FilterSelect
          label="Filter by priority"
          value={priority}
          allLabel="Any priority"
          options={Object.values(TaskPriority).map((p): [string, string] => [
            p,
            taskPriorityLabel[p],
          ])}
          onChange={(v) => update({ priority: v })}
        />
        <FilterSelect
          label="Filter by due date"
          value={due}
          allLabel="Any due date"
          options={Object.entries(DUE_OPTIONS)}
          onChange={(v) => update({ due: v })}
          className="w-44"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ project: null, priority: null, due: null })}
          >
            <XIcon /> Clear
          </Button>
        )}
        <SaveViewButton
          path="/my-work"
          query={location.search.slice(1)}
          defaultName="My work view"
        />
        {tasks.data && (overdueCount > 0 || dueSoonCount > 0) && (
          <div className="flex gap-2 sm:ml-auto" aria-live="polite">
            {overdueCount > 0 && (
              <Badge variant="outline" className={toneBadgeClass.danger}>
                {overdueCount} overdue
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge variant="outline" className={toneBadgeClass.warning}>
                {dueSoonCount} due this week
              </Badge>
            )}
          </div>
        )}
      </div>

      {tasks.isPending ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading your tasks">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : tasks.isError ? (
        <ErrorState
          title="Could not load your tasks"
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
        />
      ) : all.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No tasks match your filters"
            action={
              <Button
                variant="outline"
                onClick={() => update({ project: null, priority: null, due: null })}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={PartyPopperIcon}
            title="Nothing assigned to you"
            description="Tasks assigned to you in any project will show up here."
          />
        )
      ) : (
        <div
          className={cn('space-y-6 transition-opacity', tasks.isPlaceholderData && 'opacity-60')}
        >
          {BOARD_COLUMNS.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              tasks={all.filter((t) => t.status === status)}
              returnTo={returnTo}
              // Done work is history: collapsed by default to keep the focus on open tasks.
              defaultOpen={status !== TaskStatus.DONE}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatusGroupProps {
  status: TaskStatus;
  tasks: TaskDto[];
  returnTo: string;
  defaultOpen: boolean;
}

function StatusGroup({ status, tasks, returnTo, defaultOpen }: StatusGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `my-work-${status}`;
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2 id={headingId}>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md py-1 pr-2 text-sm font-semibold hover:text-foreground/80"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Chevron className="size-4 text-muted-foreground" aria-hidden />
          <span
            className={cn('size-2 rounded-full border', toneBadgeClass[TASK_STATUS_TONE[status]])}
            aria-hidden
          />
          {taskStatusLabel[status]}
          <span className="rounded-full bg-muted px-2 text-xs font-normal text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </button>
      </h2>
      {open &&
        (tasks.length === 0 ? (
          <p className="pl-8 text-sm text-muted-foreground">No tasks.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <MyWorkTaskRow key={t.id} task={t} returnTo={returnTo} />
            ))}
          </ul>
        ))}
    </section>
  );
}
