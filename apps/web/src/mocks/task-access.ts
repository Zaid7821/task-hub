import type { TaskActivityAction } from '@aionos/shared';
import { canEditTasks, canViewProject } from './access';
import { db, newId, nowIso, type ProjectRow, type TaskRow, type UserRow } from './db';
import { apiError } from './http';

export function isEnumValue<T extends string>(
  values: Record<string, T>,
  value: unknown,
): value is T {
  return typeof value === 'string' && (Object.values(values) as string[]).includes(value);
}

export function projectOf(task: TaskRow): ProjectRow {
  const project = db.projects.find((p) => p.id === task.projectId);
  if (!project) throw new Error(`Mock DB integrity: project ${task.projectId} missing`);
  return project;
}

/** A task the caller can see; tasks in projects they cannot view are reported as not found. */
export function requireViewableTask(request: Request, user: UserRow, taskId: unknown): TaskRow {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || !canViewProject(user, projectOf(task)))
    throw apiError(request, 404, 'Task not found');
  return task;
}

export function requireEditableTask(request: Request, user: UserRow, taskId: unknown): TaskRow {
  const task = requireViewableTask(request, user, taskId);
  if (!canEditTasks(user, projectOf(task))) {
    throw apiError(request, 403, 'You cannot edit tasks in this project');
  }
  return task;
}

export function logActivity(
  task: TaskRow,
  actorId: string,
  action: TaskActivityAction,
  field: string | null = null,
  oldValue: string | null = null,
  newValue: string | null = null,
): void {
  db.activities.push({
    id: newId(),
    taskId: task.id,
    actorId,
    action,
    field,
    oldValue,
    newValue,
    createdAt: nowIso(),
  });
}
