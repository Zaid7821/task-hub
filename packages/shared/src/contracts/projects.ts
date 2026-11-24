import type { ProjectMemberRole, ProjectStatus, ProjectVisibility } from '../enums.js';
import type {
  IsoDate,
  IsoDateTime,
  NamedRef,
  PaginationQuery,
  SortDirection,
  UserSummary,
} from './common.js';

/** GET /projects (items), GET /projects/by-key/:key, POST/PATCH responses */
export interface ProjectDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  owner: UserSummary;
  department: NamedRef;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  /** completedTaskCount / taskCount as an integer percentage (0 when there are no tasks). */
  progress: number;
  /** The requesting user's membership role, or null if not a member. */
  myRole: ProjectMemberRole | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type ProjectSortField = 'name' | 'key' | 'createdAt' | 'progress';

/** GET /projects */
export interface ProjectListQuery extends PaginationQuery {
  search?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  departmentId?: string;
  /** Only projects the current user is a member of. */
  mine?: boolean;
  /** ARCHIVED projects are excluded unless this is true or `status=ARCHIVED` is requested. */
  includeArchived?: boolean;
  sort?: ProjectSortField;
  order?: SortDirection;
}

/** POST /projects */
export interface CreateProjectInput {
  key: string;
  name: string;
  description?: string;
  departmentId: string;
  visibility: ProjectVisibility;
  startDate?: IsoDate;
  endDate?: IsoDate;
}

/** PATCH /projects/:id */
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  startDate?: IsoDate | null;
  endDate?: IsoDate | null;
}

/** GET /projects/:id/members (items) */
export interface ProjectMemberDto {
  projectId: string;
  user: UserSummary;
  role: ProjectMemberRole;
  createdAt: IsoDateTime;
}

/** POST /projects/:id/members */
export interface AddProjectMemberInput {
  userId: string;
  role: ProjectMemberRole;
}

/** PATCH /projects/:id/members/:userId */
export interface UpdateProjectMemberInput {
  role: ProjectMemberRole;
}
