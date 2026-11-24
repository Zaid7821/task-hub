import { ProjectVisibility } from '@aionos/shared';
import { BuildingIcon, GlobeIcon, LockIcon, type LucideIcon } from 'lucide-react';
import { projectVisibilityLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

const ICONS: Record<ProjectVisibility, LucideIcon> = {
  [ProjectVisibility.PUBLIC]: GlobeIcon,
  [ProjectVisibility.DEPARTMENT]: BuildingIcon,
  [ProjectVisibility.PRIVATE]: LockIcon,
};

export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: ProjectVisibility;
  className?: string;
}) {
  const Icon = ICONS[visibility];
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
      <Icon className="size-3.5" aria-hidden />
      {projectVisibilityLabel[visibility]}
    </span>
  );
}
