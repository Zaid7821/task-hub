// Project permission rules. Must stay identical to apps/web/src/lib/permissions.ts and
// apps/web/src/mocks/access.ts (see CLAUDE.md, "Permissions model").
import { ProjectMemberRole, ProjectVisibility, SystemRole } from '../generated/prisma/enums.js';
import type { AuthUser } from './auth-user.js';
import { ROLE_RANK } from './role-mapper.js';

export type ProjectAccessLevel = 'view' | 'edit-tasks' | 'manage-members';

export interface ProjectAccessSubject {
  visibility: ProjectVisibility;
  departmentId: string;
}

type Caller = Pick<AuthUser, 'systemRole' | 'departmentId'>;

export function canViewProject(
  user: Caller,
  project: ProjectAccessSubject,
  memberRole: ProjectMemberRole | null,
): boolean {
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  if (memberRole !== null) return true;
  if (project.visibility === ProjectVisibility.PUBLIC) return true;
  if (project.visibility === ProjectVisibility.DEPARTMENT) {
    return user.departmentId !== null && user.departmentId === project.departmentId;
  }
  // TODO(phase-x): decide whether a DEPARTMENT_HEAD may see PRIVATE projects of their department.
  return false;
}

export function canEditProjectTasks(user: Caller, memberRole: ProjectMemberRole | null): boolean {
  if (user.systemRole === SystemRole.VIEWER) return false;
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  // TODO(phase-x): treat ARCHIVED/COMPLETED projects as read-only for everyone but SUPER_ADMIN.
  return memberRole === ProjectMemberRole.OWNER || memberRole === ProjectMemberRole.MEMBER;
}

export function canManageProjectMembers(
  user: Caller,
  project: ProjectAccessSubject,
  memberRole: ProjectMemberRole | null,
): boolean {
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  if (memberRole === ProjectMemberRole.OWNER) return true;
  return (
    ROLE_RANK[user.systemRole] >= ROLE_RANK[SystemRole.MANAGER] &&
    user.departmentId !== null &&
    user.departmentId === project.departmentId
  );
}

/** Single entry point used by ProjectAccessGuard and by services for task-scoped checks. */
export function hasProjectAccess(
  level: ProjectAccessLevel,
  user: Caller,
  project: ProjectAccessSubject,
  memberRole: ProjectMemberRole | null,
): boolean {
  if (!canViewProject(user, project, memberRole)) return false;
  switch (level) {
    case 'view':
      return true;
    case 'edit-tasks':
      return canEditProjectTasks(user, memberRole);
    case 'manage-members':
      return canManageProjectMembers(user, project, memberRole);
  }
}
