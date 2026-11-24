import type { TaskDto } from '@aionos/shared';

/** Shareable URL of a task, e.g. /projects/HRP/tasks/HRP-12. */
export const taskPath = (task: Pick<TaskDto, 'key' | 'project'>): string =>
  `/projects/${task.project.key}/tasks/${task.key}`;

export type TaskBackground = 'board' | 'list';

/** Router state for links that open the task drawer. */
export interface TaskRouteState {
  /** Project tab rendered behind the drawer (defaults to the board). */
  background?: TaskBackground;
  /** Where closing the drawer goes (defaults to the background tab). */
  returnTo?: string;
}

export const taskRouteState = (state: TaskRouteState): TaskRouteState => state;
