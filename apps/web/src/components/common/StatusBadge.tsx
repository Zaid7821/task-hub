import { ProjectStatus, type TaskStatus } from '@aionos/shared';
import { Badge } from '@/components/ui/badge';
import { projectStatusLabel, taskStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { TASK_STATUS_TONE, toneBadgeClass, type Tone } from './tones';

const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  [ProjectStatus.ACTIVE]: 'success',
  [ProjectStatus.ON_HOLD]: 'warning',
  [ProjectStatus.COMPLETED]: 'info',
  [ProjectStatus.ARCHIVED]: 'neutral',
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(toneBadgeClass[PROJECT_STATUS_TONE[status]], className)}>
      {projectStatusLabel[status]}
    </Badge>
  );
}

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(toneBadgeClass[TASK_STATUS_TONE[status]], className)}>
      {taskStatusLabel[status]}
    </Badge>
  );
}
