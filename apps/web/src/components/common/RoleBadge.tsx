import { SystemRole } from '@aionos/shared';
import { Badge } from '@/components/ui/badge';
import { systemRoleLabel } from '@/lib/labels';
import { toneBadgeClass, type Tone } from './tones';

const ROLE_TONE: Record<SystemRole, Tone> = {
  [SystemRole.SUPER_ADMIN]: 'danger',
  [SystemRole.DEPARTMENT_HEAD]: 'brand',
  [SystemRole.MANAGER]: 'info',
  [SystemRole.EMPLOYEE]: 'neutral',
  [SystemRole.VIEWER]: 'neutral',
};

export function RoleBadge({ role }: { role: SystemRole }) {
  return (
    <Badge variant="outline" className={toneBadgeClass[ROLE_TONE[role]]}>
      {systemRoleLabel[role]}
    </Badge>
  );
}
