import type { NotificationType } from '@aionos/shared';
import { canViewProject } from './access';
import { db, newId, nowIso } from './db';
import { userById } from './serializers';

interface NotifyInput {
  recipients: (string | null | undefined)[];
  type: NotificationType;
  actorId: string;
  taskId?: string;
  timesheetId?: string;
  data?: Record<string, string>;
}

/**
 * Creates in-app notifications, mirroring the planned NotificationsService: never notifies the
 * actor about their own action, skips inactive users and (for task notifications) anyone who can
 * no longer see the project. Returns the ids that were notified.
 * TODO(phase-x): fan out to email / Microsoft Teams via Graph.
 */
export function notify({
  recipients,
  type,
  actorId,
  taskId,
  timesheetId,
  data,
}: NotifyInput): string[] {
  const task = taskId ? db.tasks.find((t) => t.id === taskId) : undefined;
  const project = task ? db.projects.find((p) => p.id === task.projectId) : undefined;
  const notified: string[] = [];

  for (const userId of new Set(recipients)) {
    if (!userId || userId === actorId) continue;
    const user = userById(userId);
    if (!user?.isActive) continue;
    if (project && !canViewProject(user, project)) continue;
    db.notifications.push({
      id: newId(),
      userId,
      type,
      actorId,
      taskId: taskId ?? null,
      timesheetId: timesheetId ?? null,
      data: data ?? null,
      readAt: null,
      createdAt: nowIso(),
    });
    notified.push(userId);
  }
  return notified;
}

/** Short plain-text preview of a comment body (mentions shown as @Name). */
export function excerpt(body: string, max = 120): string {
  const text = body
    .replace(
      /<@([0-9a-f-]{36})>/gi,
      (_m, id: string) => `@${userById(id)?.displayName ?? 'someone'}`,
    )
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
