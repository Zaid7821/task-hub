import type { SortDirection, TaskDto, TaskSortField } from '@aionos/shared';
import { Link, useNavigate } from 'react-router';
import { DueDate } from '@/components/common/DueDate';
import { LabelList } from '@/components/common/LabelBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { TaskStatusBadge } from '@/components/common/StatusBadge';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { timeAgo } from '@/lib/dates';
import { taskPath, type TaskRouteState } from '../task-paths';

interface TaskTableProps {
  tasks: TaskDto[];
  sort: TaskSortField;
  order: SortDirection;
  onSort: (field: TaskSortField, order: SortDirection) => void;
  /** Where a row links to; defaults to the task URL with the board behind the drawer. */
  linkFor?: (task: TaskDto) => { to: string; state?: TaskRouteState };
}

const defaultLink = (task: TaskDto) => ({ to: taskPath(task) });

export function TaskTable({ tasks, sort, order, onSort, linkFor = defaultLink }: TaskTableProps) {
  const navigate = useNavigate();
  const head = { sort, order, onSort };

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <SortableTableHead field="taskNumber" {...head} className="w-24">
              Key
            </SortableTableHead>
            <SortableTableHead field="title" {...head}>
              Title
            </SortableTableHead>
            <SortableTableHead field="status" {...head} className="w-32">
              Status
            </SortableTableHead>
            <SortableTableHead field="priority" {...head} className="w-28">
              Priority
            </SortableTableHead>
            <TableHead className="w-44">Assignee</TableHead>
            <SortableTableHead field="dueDate" {...head} className="w-28">
              Due
            </SortableTableHead>
            <SortableTableHead field="updatedAt" {...head} className="w-32">
              Updated
            </SortableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className="cursor-pointer"
              onClick={() => {
                const link = linkFor(task);
                void navigate(link.to, { state: link.state });
              }}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">{task.key}</TableCell>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2">
                  <TaskTypeIcon type={task.type} />
                  <Link
                    to={linkFor(task).to}
                    state={linkFor(task).state}
                    className="truncate font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {task.title}
                  </Link>
                  <LabelList labels={task.labels} max={2} />
                </span>
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={task.priority} />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <UserAvatar user={task.assignee} size="xs" />
                  <span className="truncate">
                    {task.assignee?.displayName ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <DueDate dueDate={task.dueDate} status={task.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {timeAgo(task.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TaskTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-xl border p-4" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-1.5">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden h-4 w-28 md:block" />
        </div>
      ))}
    </div>
  );
}
