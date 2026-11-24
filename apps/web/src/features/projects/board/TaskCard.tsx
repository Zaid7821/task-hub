import type { TaskDto } from '@aionos/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquareIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ChecklistChip } from '@/components/common/ChecklistChip';
import { DueDate } from '@/components/common/DueDate';
import { LabelList } from '@/components/common/LabelBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { UserAvatar } from '@/components/common/UserAvatar';
import { isOverdue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { taskPath, taskRouteState } from '@/features/tasks/task-paths';

const BOARD_STATE = taskRouteState({ background: 'board' });

/** Visual card, shared by the sortable card and the drag overlay. */
export function TaskCardView({ task, dragging = false }: { task: TaskDto; dragging?: boolean }) {
  const overdue = isOverdue(task);
  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-shadow',
        overdue && 'border-l-2 border-l-overdue',
        // No rotation: a rotated overlay shifts its bounding rect and breaks keyboard moves.
        dragging && 'shadow-lg ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TaskTypeIcon type={task.type} className="size-3.5" />
        <span className="font-mono">{task.key}</span>
        <PriorityBadge priority={task.priority} compact className="ml-auto" />
      </div>
      <Link
        to={taskPath(task)}
        state={BOARD_STATE}
        className="line-clamp-3 font-medium leading-snug hover:underline"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      >
        {task.title}
      </Link>
      <LabelList labels={task.labels} />
      <div className="flex items-center gap-2">
        <DueDate dueDate={task.dueDate} status={task.status} />
        <ChecklistChip checklist={task.checklist} />
        {task.commentCount > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="Comments"
          >
            <MessageSquareIcon className="size-3.5" aria-hidden />
            {task.commentCount}
          </span>
        )}
        <UserAvatar user={task.assignee} size="xs" className="ml-auto" />
      </div>
    </div>
  );
}

export function SortableTaskCard({ task, disabled }: { task: TaskDto; disabled: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'list-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      aria-label={`${task.key}: ${task.title}`}
      onClick={() => void navigate(taskPath(task), { state: BOARD_STATE })}
      {...attributes}
      {...listeners}
    >
      <TaskCardView task={task} />
    </li>
  );
}
