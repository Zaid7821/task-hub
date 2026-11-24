import type { TaskDto, TaskStatus } from '@aionos/shared';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TASK_STATUS_TONE, toneBadgeClass } from '@/components/common/tones';
import { taskStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { columnDropId } from './board-utils';
import { SortableTaskCard } from './TaskCard';

interface BoardColumnProps {
  status: TaskStatus;
  tasks: TaskDto[];
  canEdit: boolean;
}

export function BoardColumn({ status, tasks, canEdit }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status) });
  const headingId = `column-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-72 shrink-0 snap-start flex-col rounded-xl bg-muted/50 xl:w-auto xl:min-w-0 xl:flex-1"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span
          className={cn('size-2 rounded-full border', toneBadgeClass[TASK_STATUS_TONE[status]])}
          aria-hidden
        />
        <h2 id={headingId} className="text-sm font-semibold">
          {taskStatusLabel[status]}
        </h2>
        <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            'flex min-h-32 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors',
            isOver && 'bg-primary/5',
          )}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} disabled={!canEdit} />
          ))}
          {tasks.length === 0 && (
            <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
              {canEdit ? 'Drop tasks here' : 'No tasks'}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
