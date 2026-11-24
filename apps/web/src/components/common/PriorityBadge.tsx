import { TaskPriority } from '@aionos/shared';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpIcon,
  EqualIcon,
  type LucideIcon,
} from 'lucide-react';
import { taskPriorityLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

const PRIORITY_STYLE: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  [TaskPriority.LOW]: { icon: ChevronDownIcon, className: 'text-muted-foreground' },
  [TaskPriority.MEDIUM]: { icon: EqualIcon, className: 'text-info' },
  [TaskPriority.HIGH]: { icon: ChevronUpIcon, className: 'text-warning' },
  [TaskPriority.CRITICAL]: { icon: ChevronsUpIcon, className: 'text-destructive' },
};

interface PriorityBadgeProps {
  priority: TaskPriority;
  /** Icon only (label kept for screen readers and tooltip). */
  compact?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, compact = false, className }: PriorityBadgeProps) {
  const { icon: Icon, className: tone } = PRIORITY_STYLE[priority];
  const label = taskPriorityLabel[priority];
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium', tone, className)}
      title={`${label} priority`}
    >
      <Icon className="size-4" aria-hidden />
      {compact ? <span className="sr-only">{label} priority</span> : label}
    </span>
  );
}
