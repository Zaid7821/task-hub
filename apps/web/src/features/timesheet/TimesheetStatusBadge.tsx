import type { TimesheetStatus } from '@aionos/shared';
import { TIMESHEET_STATUS_TONE, toneBadgeClass } from '@/components/common/tones';
import { Badge } from '@/components/ui/badge';
import { timesheetStatusLabel } from '@/lib/labels';

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  return (
    <Badge variant="outline" className={toneBadgeClass[TIMESHEET_STATUS_TONE[status]]}>
      {timesheetStatusLabel[status]}
    </Badge>
  );
}
