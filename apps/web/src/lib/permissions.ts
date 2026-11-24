// Single source of truth for what the UI shows or enables per user.
// UX only: the API enforces the same rules independently (mirrored in src/mocks/access.ts).
import { ProjectMemberRole, SystemRole, type ProjectDto, type UserDto } from '@aionos/shared';

export type Viewer = Pick<UserDto, 'id' | 'systemRole' | 'department'>;
type ProjectAccess = Pick<ProjectDto, 'myRole' | 'department'>;

const ROLE_RANK: Record<SystemRole, number> = {
  [SystemRole.VIEWER]: 0,
  [SystemRole.EMPLOYEE]: 1,
  [SystemRole.MANAGER]: 2,
  [SystemRole.DEPARTMENT_HEAD]: 3,
  [SystemRole.SUPER_ADMIN]: 4,
};

export function hasRoleAtLeast(viewer: Viewer, role: SystemRole): boolean {
  return ROLE_RANK[viewer.systemRole] >= ROLE_RANK[role];
}

export function isSuperAdmin(viewer: Viewer): boolean {
  return viewer.systemRole === SystemRole.SUPER_ADMIN;
}

export function canAccessAdmin(viewer: Viewer): boolean {
  return isSuperAdmin(viewer);
}

export function canCreateProject(viewer: Viewer): boolean {
  return hasRoleAtLeast(viewer, SystemRole.MANAGER);
}

/** Create, edit, move and assign tasks; comment; log time. Read-only for VIEWER role and project viewers. */
export function canEditProjectTasks(viewer: Viewer, project: ProjectAccess): boolean {
  if (viewer.systemRole === SystemRole.VIEWER) return false;
  if (isSuperAdmin(viewer)) return true;
  return project.myRole === ProjectMemberRole.OWNER || project.myRole === ProjectMemberRole.MEMBER;
}

/** Log time and keep a timesheet: everyone except the read-only VIEWER role. */
export function canLogTime(viewer: Viewer): boolean {
  return viewer.systemRole !== SystemRole.VIEWER;
}

/** See the timesheet approvals queue (weeks are routed to managers / department heads). */
export function canApproveTimesheets(viewer: Viewer): boolean {
  return hasRoleAtLeast(viewer, SystemRole.MANAGER);
}

/** Create, rename, recolour and delete project labels: same people who manage members. */
export function canManageProjectLabels(viewer: Viewer, project: ProjectAccess): boolean {
  return canManageProjectMembers(viewer, project);
}

/** Add/remove members: project owner, or a manager/department head of the project's department. */
export function canManageProjectMembers(viewer: Viewer, project: ProjectAccess): boolean {
  if (isSuperAdmin(viewer)) return true;
  if (project.myRole === ProjectMemberRole.OWNER) return true;
  return (
    hasRoleAtLeast(viewer, SystemRole.MANAGER) && viewer.department?.id === project.department.id
  );
}
