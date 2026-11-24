import {
  TaskPriority,
  TaskStatus,
  type SortDirection,
  type TaskListQuery,
  type TaskSortField,
} from '@aionos/shared';
import { ListTodoIcon, SearchXIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { taskPath } from '@/features/tasks/task-paths';
import { useProjectLabels } from '@/api/labels';
import { useProjectMembers } from '@/api/members';
import { SaveViewButton } from '@/components/common/SaveViewButton';
import { useTasks } from '@/api/tasks';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterSelect } from '@/components/common/FilterSelect';
import { ErrorState } from '@/components/common/ErrorState';
import { PaginationBar } from '@/components/common/PaginationBar';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { parseEnumParam, useUrlParams } from '@/hooks/use-url-params';
import { taskPriorityLabel, taskStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { TaskTable, TaskTableSkeleton } from '@/features/tasks/components/TaskTable';
import { useProjectContext } from './project-context';

type ListParam = 'q' | 'status' | 'priority' | 'assignee' | 'label' | 'sort' | 'order';
const PAGE_SIZE = 20;
const SORT_FIELDS: TaskSortField[] = [
  'taskNumber',
  'title',
  'status',
  'priority',
  'dueDate',
  'updatedAt',
];

export function ListTab() {
  const { project } = useProjectContext();
  const location = useLocation();
  const members = useProjectMembers(project.id);
  const labels = useProjectLabels(project.id);
  const { params, update, page } = useUrlParams<ListParam>();
  const [searchResets, setSearchResets] = useState(0);

  const search = params.get('q') ?? '';
  const status = parseEnumParam(TaskStatus, params.get('status'));
  const priority = parseEnumParam(TaskPriority, params.get('priority'));
  const assignee = params.get('assignee') ?? undefined;
  const labelId = params.get('label') ?? undefined;
  const rawSort = params.get('sort');
  const sort: TaskSortField = SORT_FIELDS.find((f) => f === rawSort) ?? 'taskNumber';
  const order: SortDirection = params.get('order') === 'desc' ? 'desc' : 'asc';
  const hasFilters = Boolean(search || status || priority || assignee || labelId);

  const query: TaskListQuery = {
    projectId: project.id,
    search: search || undefined,
    status,
    priority,
    assigneeId: assignee,
    labelId,
    sort,
    order,
    page,
    pageSize: PAGE_SIZE,
  };
  const tasks = useTasks(query);

  const clearFilters = () => {
    update({ q: null, status: null, priority: null, assignee: null, label: null });
    setSearchResets((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          key={searchResets}
          value={search}
          onCommit={(q) => update({ q })}
          placeholder="Search title or key"
          label="Search tasks"
          className="w-full sm:w-64"
        />
        <FilterSelect
          label="Filter by status"
          value={status}
          allLabel="Any status"
          options={Object.values(TaskStatus).map((s) => [s, taskStatusLabel[s]])}
          onChange={(v) => update({ status: v })}
        />
        <FilterSelect
          label="Filter by priority"
          value={priority}
          allLabel="Any priority"
          options={Object.values(TaskPriority).map((p) => [p, taskPriorityLabel[p]])}
          onChange={(v) => update({ priority: v })}
        />
        <FilterSelect
          label="Filter by assignee"
          value={assignee}
          allLabel="Anyone"
          options={[
            ['me', 'Assigned to me'],
            ['none', 'Unassigned'],
            ...(members.data ?? []).map((m): [string, string] => [m.user.id, m.user.displayName]),
          ]}
          onChange={(v) => update({ assignee: v })}
        />
        {(labels.data?.length ?? 0) > 0 && (
          <FilterSelect
            label="Filter by label"
            value={labelId}
            allLabel="Any label"
            options={(labels.data ?? []).map((l): [string, string] => [l.id, l.name])}
            onChange={(v) => update({ label: v })}
          />
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon /> Clear
          </Button>
        )}
        <SaveViewButton
          className="sm:ml-auto"
          path={`/projects/${project.key}/list`}
          query={location.search.slice(1)}
          defaultName={`${project.key} tasks`}
        />
      </div>

      {tasks.isPending ? (
        <TaskTableSkeleton />
      ) : tasks.isError ? (
        <ErrorState
          title="Could not load tasks"
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
        />
      ) : tasks.data.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No tasks match your filters"
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState icon={ListTodoIcon} title="No tasks in this project yet" />
        )
      ) : (
        <div
          className={cn('space-y-4 transition-opacity', tasks.isPlaceholderData && 'opacity-60')}
        >
          <TaskTable
            tasks={tasks.data.data}
            // Keep the list's filters in the task URL so the same view stays behind the drawer.
            linkFor={(task) => ({
              to: `${taskPath(task)}${location.search}`,
              state: { background: 'list' },
            })}
            sort={sort}
            order={order}
            onSort={(field, nextOrder) =>
              update({
                sort: field === 'taskNumber' ? null : field,
                order: nextOrder === 'asc' ? null : nextOrder,
              })
            }
          />
          <PaginationBar
            meta={tasks.data.meta}
            isFetching={tasks.isFetching}
            onPageChange={(p) => update({ page: p > 1 ? String(p) : null })}
          />
        </div>
      )}
    </div>
  );
}
