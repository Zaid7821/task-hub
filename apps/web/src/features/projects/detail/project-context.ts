import type { ProjectDto } from '@aionos/shared';
import { useOutletContext } from 'react-router';

export interface ProjectOutletContext {
  project: ProjectDto;
  canEditTasks: boolean;
  canManageMembers: boolean;
  canManageLabels: boolean;
}

/** The loaded project and the viewer's permissions, provided by ProjectDetailLayout to its tabs. */
export function useProjectContext(): ProjectOutletContext {
  return useOutletContext<ProjectOutletContext>();
}
