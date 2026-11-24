import { TaskStatus } from '@aionos/shared';
import { useMoveTask, useProjectBoard } from '@/api/tasks';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanBoard } from '../board/KanbanBoard';
import { useProjectContext } from './project-context';

export function BoardTab() {
  const { project, canEditTasks } = useProjectContext();
  const board = useProjectBoard(project.id);
  const moveTask = useMoveTask(project.id);

  if (board.isPending) return <BoardSkeleton />;
  if (board.isError) {
    return (
      <ErrorState
        title="Could not load the board"
        error={board.error}
        onRetry={() => void board.refetch()}
      />
    );
  }

  const total = Object.values(TaskStatus).reduce((sum, s) => sum + board.data[s].length, 0);

  return (
    <div className="space-y-3">
      {total === 0 && (
        <EmptyState
          title="No tasks yet"
          description={
            canEditTasks
              ? 'Use "Create task" to add the first one. You can then drag it across the columns.'
              : 'Tasks added to this project will appear here.'
          }
          className="py-6"
        />
      )}
      {!canEditTasks && total > 0 && (
        <p className="text-sm text-muted-foreground">You have read-only access to this board.</p>
      )}
      <KanbanBoard board={board.data} canEdit={canEditTasks} onMove={moveTask} />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading board">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-2 rounded-xl bg-muted/50 p-3 xl:flex-1">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 - (i % 2) }, (_, j) => (
            <Skeleton key={j} className="h-24 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
