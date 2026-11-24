import { SetMetadata } from '@nestjs/common';
import type { ProjectAccessLevel } from '../../auth/project-access.rules.js';

export const PROJECT_ACCESS_KEY = 'projectAccess';

export interface ProjectAccessOptions {
  level: ProjectAccessLevel;
  /** Route param holding the project id or key. Default: `projectId`. */
  param: string;
}

/**
 * Checks the caller's access to the project in the route before the handler runs, and exposes
 * it as `request.projectAccess`. Example: `@ProjectAccess('edit-tasks')` on
 * `POST /projects/:projectId/tasks`.
 */
export const ProjectAccess = (level: ProjectAccessLevel, param = 'projectId') =>
  SetMetadata(PROJECT_ACCESS_KEY, { level, param } satisfies ProjectAccessOptions);
