import { FileQuestionIcon, LockIcon } from 'lucide-react';
import { Navigate } from 'react-router';
import { ApiError } from '@/api/client';
import { useTaskByKey } from '@/api/tasks';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { taskPath } from '../task-paths';
import { TaskDetail } from './TaskDetail';

interface TaskDrawerProps {
  taskKey: string;
  projectKey: string;
  canEdit: boolean;
  canManageLabels: boolean;
  onClose: () => void;
}

export function TaskDrawer({
  taskKey,
  projectKey,
  canEdit,
  canManageLabels,
  onClose,
}: TaskDrawerProps) {
  const task = useTaskByKey(taskKey);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        onEscapeKeyDown={(e) => {
          // Escape inside an inline editor cancels the edit instead of closing the drawer.
          if (e.target instanceof Element && e.target.closest('[data-escape-cancels]')) {
            e.preventDefault();
          }
        }}
      >
        {task.isPending ? (
          <div className="space-y-4 p-4" aria-busy="true">
            <SheetTitle className="sr-only">Loading task {taskKey}</SheetTitle>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : task.isError ? (
          <div className="p-6">
            <TaskLoadError
              taskKey={taskKey}
              error={task.error}
              onRetry={() => void task.refetch()}
            />
          </div>
        ) : task.data.project.key !== projectKey ? (
          // A key from another project in this URL: send the user to the canonical URL.
          <Navigate to={taskPath(task.data)} replace />
        ) : (
          <TaskDetail task={task.data} canEdit={canEdit} canManageLabels={canManageLabels} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskLoadError({
  taskKey,
  error,
  onRetry,
}: {
  taskKey: string;
  error: Error;
  onRetry: () => void;
}) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 404) {
    return (
      <>
        <SheetTitle className="sr-only">Task not found</SheetTitle>
        <EmptyState
          icon={FileQuestionIcon}
          title={`Task ${taskKey} not found`}
          description="It may have been deleted, or the link is wrong."
        />
      </>
    );
  }
  if (status === 403) {
    return (
      <>
        <SheetTitle className="sr-only">No access</SheetTitle>
        <EmptyState icon={LockIcon} title="You don't have access to this task" />
      </>
    );
  }
  return (
    <>
      <SheetTitle className="sr-only">Error loading task</SheetTitle>
      <ErrorState title="Could not load the task" error={error} onRetry={onRetry} />
    </>
  );
}
