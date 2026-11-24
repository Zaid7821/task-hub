import type { TaskDto } from '@aionos/shared';
import { ListChecksIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "2/5" checklist progress; hidden when the task has no checklist. */
export function ChecklistChip({ checklist }: { checklist: TaskDto['checklist'] }) {
  if (checklist.total === 0) return null;
  const complete = checklist.done === checklist.total;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs tabular-nums',
        complete ? 'text-success' : 'text-muted-foreground',
      )}
      title={`Checklist: ${checklist.done} of ${checklist.total} done`}
    >
      <ListChecksIcon className="size-3.5" aria-hidden />
      {checklist.done}/{checklist.total}
      <span className="sr-only">checklist items done</span>
    </span>
  );
}
