import { TaskType } from '@aionos/shared';
import { BugIcon, CircleCheckIcon, InboxIcon, type LucideIcon } from 'lucide-react';
import { taskTypeLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

const TYPE_STYLE: Record<TaskType, { icon: LucideIcon; className: string }> = {
  [TaskType.TASK]: { icon: CircleCheckIcon, className: 'text-primary' },
  [TaskType.BUG]: { icon: BugIcon, className: 'text-destructive' },
  [TaskType.REQUEST]: { icon: InboxIcon, className: 'text-success' },
};

interface TaskTypeIconProps {
  type: TaskType;
  /** Set when the type name is already shown as text next to the icon. */
  decorative?: boolean;
  className?: string;
}

export function TaskTypeIcon({ type, decorative = false, className }: TaskTypeIconProps) {
  const { icon: Icon, className: tone } = TYPE_STYLE[type];
  return (
    <span title={taskTypeLabel[type]} className="inline-flex">
      <Icon className={cn('size-4', tone, className)} aria-hidden />
      {!decorative && <span className="sr-only">{taskTypeLabel[type]}</span>}
    </span>
  );
}
