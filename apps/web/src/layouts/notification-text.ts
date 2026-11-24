import { NotificationType, type NotificationDto, type TaskStatus } from '@aionos/shared';
import { formatDate } from '@/lib/dates';
import { taskStatusLabel } from '@/lib/labels';
import { taskPath, type TaskRouteState } from '@/features/tasks/task-paths';

/** Sentence after the actor's name, e.g. "assigned you to WTR-3". */
export function describeNotification(n: NotificationDto): string {
  const key = n.task?.key ?? 'a task';
  const week = n.timesheet ? `the week of ${formatDate(n.timesheet.weekStart, true)}` : 'a week';
  switch (n.type) {
    case NotificationType.TASK_ASSIGNED:
      return `assigned you to ${key}`;
    case NotificationType.MENTIONED:
      return `mentioned you on ${key}`;
    case NotificationType.COMMENT_ADDED:
      return `commented on ${key}`;
    case NotificationType.STATUS_CHANGED: {
      const to = n.data?.to as TaskStatus | undefined;
      return `moved ${key} to ${to ? taskStatusLabel[to] : 'a new status'}`;
    }
    case NotificationType.TIMESHEET_SUBMITTED:
      return `submitted a timesheet for ${week}`;
    case NotificationType.TIMESHEET_APPROVED:
      return `approved your timesheet for ${week}`;
    case NotificationType.TIMESHEET_REJECTED:
      return `rejected your timesheet for ${week}`;
    default:
      return 'sent you an update';
  }
}

/** Where clicking a notification goes. */
export function notificationTarget(
  n: NotificationDto,
  returnTo: string,
): { to: string; state?: TaskRouteState } | null {
  if (n.task) {
    return {
      to: taskPath({ key: n.task.key, project: { id: '', key: n.task.projectKey, name: '' } }),
      state: { returnTo },
    };
  }
  if (n.timesheet) {
    return n.type === NotificationType.TIMESHEET_SUBMITTED
      ? { to: `/timesheet/approvals/${n.timesheet.id}` }
      : { to: `/timesheet?week=${n.timesheet.weekStart}` };
  }
  return null;
}
