import {
  ProjectMemberRole,
  TaskPriority,
  TaskStatus,
  TaskType,
  type ProjectMemberDto,
  type TaskDto,
} from '@aionos/shared';
import { useState, type ReactNode } from 'react';
import type { useTaskFieldMutations } from '@/api/tasks';
import { DueDate } from '@/components/common/DueDate';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { TaskStatusBadge } from '@/components/common/StatusBadge';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/dates';
import { taskTypeLabel } from '@/lib/labels';
import { NO_ESTIMATE, STORY_POINTS, UNASSIGNED } from '../task-form';

type Mutations = ReturnType<typeof useTaskFieldMutations>;

interface TaskPropertiesProps {
  task: TaskDto;
  /** Undefined while the member list is loading. */
  members: ProjectMemberDto[] | undefined;
  canEdit: boolean;
  mutations: Mutations;
  /** Label picker, rendered in its own row. */
  labelsSlot: ReactNode;
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1">
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

const triggerClass = 'h-8 w-full max-w-60 border-transparent shadow-none hover:border-input';

export function TaskProperties({
  task,
  members,
  canEdit,
  mutations,
  labelsSlot,
}: TaskPropertiesProps) {
  const assignable = (members ?? []).filter((m) => m.role !== ProjectMemberRole.VIEWER);
  // Keep the current assignee selectable while members load, or if they left the project.
  const assigneeIsMember = assignable.some((m) => m.user.id === task.assignee?.id);
  const assigneeOptions =
    task.assignee && !assigneeIsMember
      ? [
          {
            id: task.assignee.id,
            name: members
              ? `${task.assignee.displayName} (not a member)`
              : task.assignee.displayName,
          },
        ]
      : [];
  const points = [
    ...new Set([...STORY_POINTS, ...(task.estimatePoints ? [task.estimatePoints] : [])]),
  ].sort((a, b) => a - b);

  return (
    <div className="grid gap-x-6 sm:grid-cols-2">
      <div>
        <Row label="Status" htmlFor="task-status">
          {canEdit ? (
            <Select
              value={task.status}
              onValueChange={(v) => mutations.changeStatus.mutate(v as TaskStatus)}
            >
              <SelectTrigger id="task-status" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    <TaskStatusBadge status={s} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
        </Row>
        <Row label="Assignee" htmlFor="task-assignee">
          {canEdit ? (
            <Select
              value={task.assignee?.id ?? UNASSIGNED}
              onValueChange={(v) => mutations.reassign.mutate(v === UNASSIGNED ? null : v)}
            >
              <SelectTrigger id="task-assignee" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>
                  <UserAvatar user={null} size="xs" /> Unassigned
                </SelectItem>
                <SelectSeparator />
                {assignable.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    <UserAvatar user={m.user} size="xs" /> {m.user.displayName}
                  </SelectItem>
                ))}
                {assigneeOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="flex items-center gap-2">
              <UserAvatar user={task.assignee} size="xs" />
              {task.assignee?.displayName ?? 'Unassigned'}
            </span>
          )}
        </Row>
        <Row label="Priority" htmlFor="task-priority-select">
          {canEdit ? (
            <Select
              value={task.priority}
              onValueChange={(v) => mutations.update.mutate({ priority: v as TaskPriority })}
            >
              <SelectTrigger id="task-priority-select" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskPriority).map((p) => (
                  <SelectItem key={p} value={p}>
                    <PriorityBadge priority={p} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <PriorityBadge priority={task.priority} />
          )}
        </Row>
        <Row label="Type" htmlFor="task-type-select">
          {canEdit ? (
            <Select
              value={task.type}
              onValueChange={(v) => mutations.update.mutate({ type: v as TaskType })}
            >
              <SelectTrigger id="task-type-select" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskType).map((t) => (
                  <SelectItem key={t} value={t}>
                    <TaskTypeIcon type={t} decorative /> {taskTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="flex items-center gap-2">
              <TaskTypeIcon type={task.type} decorative /> {taskTypeLabel[task.type]}
            </span>
          )}
        </Row>
      </div>

      <div>
        <Row label="Due date" htmlFor="task-due-date">
          {canEdit ? (
            <BlurSaveInput
              key={`due-${task.dueDate ?? ''}`}
              id="task-due-date"
              type="date"
              initial={task.dueDate ?? ''}
              onSave={(v) => mutations.update.mutate({ dueDate: v || null })}
            />
          ) : task.dueDate ? (
            <DueDate dueDate={task.dueDate} status={task.status} short={false} />
          ) : (
            '—'
          )}
        </Row>
        <Row label="Estimate" htmlFor="task-points-select">
          {canEdit ? (
            <Select
              value={task.estimatePoints === null ? NO_ESTIMATE : String(task.estimatePoints)}
              onValueChange={(v) =>
                mutations.update.mutate({ estimatePoints: v === NO_ESTIMATE ? null : Number(v) })
              }
            >
              <SelectTrigger id="task-points-select" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ESTIMATE}>No estimate</SelectItem>
                <SelectSeparator />
                {points.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p} {p === 1 ? 'point' : 'points'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : task.estimatePoints === null ? (
            '—'
          ) : (
            `${task.estimatePoints} points`
          )}
        </Row>
        <Row label="Hours (est.)" htmlFor="task-hours">
          {canEdit ? (
            <BlurSaveInput
              key={`hours-${task.estimateHours ?? ''}`}
              id="task-hours"
              type="number"
              min={0}
              max={999}
              step={0.5}
              placeholder="—"
              initial={task.estimateHours === null ? '' : String(task.estimateHours)}
              onSave={(v) => {
                const hours = v === '' ? null : Number(v);
                if (hours === null || (Number.isFinite(hours) && hours >= 0 && hours <= 999)) {
                  mutations.update.mutate({ estimateHours: hours });
                }
              }}
            />
          ) : task.estimateHours === null ? (
            '—'
          ) : (
            `${task.estimateHours} h`
          )}
        </Row>
        <Row label="Logged">
          <span className="tabular-nums">
            {task.loggedHours} h
            {task.estimateHours ? (
              <span className="text-muted-foreground"> of {task.estimateHours} h estimated</span>
            ) : null}
          </span>
        </Row>
      </div>

      <div className="sm:col-span-2">
        <Row label="Labels">{labelsSlot}</Row>
      </div>

      <div className="mt-2 border-t pt-2 sm:col-span-2">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Row label="Reporter">
            <span className="flex items-center gap-2">
              <UserAvatar user={task.reporter} size="xs" />
              {task.reporter.displayName}
            </span>
          </Row>
          <Row label="Created">{formatDateTime(task.createdAt)}</Row>
          {task.startedAt && <Row label="Started">{formatDateTime(task.startedAt)}</Row>}
          {task.completedAt && <Row label="Completed">{formatDateTime(task.completedAt)}</Row>}
          <Row label="Updated">{formatDateTime(task.updatedAt)}</Row>
        </div>
      </div>
    </div>
  );
}

interface BlurSaveInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  'onChange' | 'value'
> {
  initial: string;
  onSave: (value: string) => void;
}

/** Native input that saves when focus leaves (or Enter), only if the value changed. */
function BlurSaveInput({ initial, onSave, ...props }: BlurSaveInputProps) {
  const [value, setValue] = useState(initial);
  const save = () => {
    if (value !== initial) onSave(value);
  };
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="h-8 w-full max-w-60 border-transparent shadow-none hover:border-input"
    />
  );
}
