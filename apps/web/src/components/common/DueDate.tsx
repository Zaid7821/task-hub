import type { IsoDate, TaskStatus } from '@aionos/shared';
import { CalendarIcon } from 'lucide-react';
import { formatDate, isOverdue } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface DueDateProps {
  dueDate: IsoDate | null;
  status: TaskStatus;
  short?: boolean;
  className?: string;
}

/** Due date, shown in the overdue color (with an accessible label) when past due and not done. */
export function DueDate({ dueDate, status, short = true, className }: DueDateProps) {
  if (!dueDate) return null;
  const overdue = isOverdue({ dueDate, status });
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        overdue ? 'font-medium text-overdue' : 'text-muted-foreground',
        className,
      )}
      title={overdue ? 'Overdue' : 'Due date'}
    >
      <CalendarIcon className="size-3.5" aria-hidden />
      {formatDate(dueDate, short)}
      {overdue && <span className="sr-only">(overdue)</span>}
    </span>
  );
}
