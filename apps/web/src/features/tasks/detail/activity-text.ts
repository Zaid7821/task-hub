import {
  TaskActivityAction,
  type TaskActivityDto,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from '@aionos/shared';
import { formatDate } from '@/lib/dates';
import { taskPriorityLabel, taskStatusLabel, taskTypeLabel } from '@/lib/labels';

type NameLookup = (userId: string | null) => string;

const FIELD_LABEL: Record<string, string> = {
  title: 'title',
  description: 'description',
  type: 'type',
  priority: 'priority',
  estimatePoints: 'estimate',
  estimateHours: 'hour estimate',
  dueDate: 'due date',
  labels: 'labels',
};

function fieldValue(field: string, value: string | null): string {
  if (value === null) return 'none';
  switch (field) {
    case 'priority':
      return taskPriorityLabel[value as TaskPriority] ?? value;
    case 'type':
      return taskTypeLabel[value as TaskType] ?? value;
    case 'dueDate':
      return formatDate(value);
    case 'estimatePoints':
      return `${value} pts`;
    case 'estimateHours':
      return `${value} h`;
    default:
      return `“${value}”`;
  }
}

/** Human sentence for an activity entry (without the actor's name). */
export function describeActivity(a: TaskActivityDto, nameOf: NameLookup): string {
  switch (a.action) {
    case TaskActivityAction.CREATED:
      return 'created this task';
    case TaskActivityAction.STATUS_CHANGED:
      return `moved from ${taskStatusLabel[a.oldValue as TaskStatus] ?? a.oldValue} to ${
        taskStatusLabel[a.newValue as TaskStatus] ?? a.newValue
      }`;
    case TaskActivityAction.ASSIGNED:
      return a.oldValue
        ? `reassigned from ${nameOf(a.oldValue)} to ${nameOf(a.newValue)}`
        : `assigned to ${nameOf(a.newValue)}`;
    case TaskActivityAction.UNASSIGNED:
      return `unassigned ${nameOf(a.oldValue)}`;
    case TaskActivityAction.MOVED:
      return 'reordered the task on the board';
    case TaskActivityAction.UPDATED: {
      const field = a.field ?? '';
      const label = FIELD_LABEL[field] ?? field;
      if (field === 'description') return 'updated the description';
      if (a.newValue === null) return `cleared the ${label}`;
      if (field === 'title') return `renamed the task to ${fieldValue(field, a.newValue)}`;
      return `changed ${label} from ${fieldValue(field, a.oldValue)} to ${fieldValue(field, a.newValue)}`;
    }
    default:
      return 'updated the task';
  }
}
