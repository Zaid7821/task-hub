import { LabelColor, TaskStatus, TimesheetStatus } from '@aionos/shared';

/** Semantic color tones built only from theme tokens (see index.css). */
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';

export const toneBadgeClass: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  brand: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/15 text-foreground',
  info: 'border-info/30 bg-info/10 text-info',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  [TaskStatus.TODO]: 'neutral',
  [TaskStatus.IN_PROGRESS]: 'brand',
  [TaskStatus.IN_REVIEW]: 'warning',
  [TaskStatus.DONE]: 'success',
};

export const TIMESHEET_STATUS_TONE: Record<TimesheetStatus, Tone> = {
  [TimesheetStatus.DRAFT]: 'neutral',
  [TimesheetStatus.SUBMITTED]: 'warning',
  [TimesheetStatus.APPROVED]: 'success',
  [TimesheetStatus.REJECTED]: 'danger',
};

/** Colour dot class per label colour (tokens defined in index.css). */
export const LABEL_DOT: Record<LabelColor, string> = {
  [LabelColor.GRAY]: 'bg-label-gray',
  [LabelColor.RED]: 'bg-label-red',
  [LabelColor.ORANGE]: 'bg-label-orange',
  [LabelColor.YELLOW]: 'bg-label-yellow',
  [LabelColor.GREEN]: 'bg-label-green',
  [LabelColor.TEAL]: 'bg-label-teal',
  [LabelColor.BLUE]: 'bg-label-blue',
  [LabelColor.PURPLE]: 'bg-label-purple',
  [LabelColor.PINK]: 'bg-label-pink',
};
