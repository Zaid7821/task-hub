// Mirrors the planned API guards (and lib/permissions.ts):
// - View: SUPER_ADMIN sees everything; PUBLIC = any active user; DEPARTMENT = same department;
//   PRIVATE = members only. Members can always see their projects.
// - Edit tasks: project OWNER/MEMBER (or SUPER_ADMIN), never system role VIEWER.
// - Manage members: SUPER_ADMIN, project OWNER, or MANAGER+ in the project's department.
import { ProjectMemberRole, ProjectVisibility, SystemRole } from '@aionos/shared';
import { db, type MemberRow, type ProjectRow, type UserRow } from './db';

const MANAGER_ROLES: SystemRole[] = [
  SystemRole.MANAGER,
  SystemRole.DEPARTMENT_HEAD,
  SystemRole.SUPER_ADMIN,
];

export function membership(projectId: string, userId: string): MemberRow | undefined {
  return db.members.find((m) => m.projectId === projectId && m.userId === userId);
}

export function isMember(projectId: string, userId: string): boolean {
  return membership(projectId, userId) !== undefined;
}

export function canViewProject(user: UserRow, project: ProjectRow): boolean {
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  if (isMember(project.id, user.id)) return true;
  if (project.visibility === ProjectVisibility.PUBLIC) return true;
  if (project.visibility === ProjectVisibility.DEPARTMENT) {
    return user.departmentId !== null && user.departmentId === project.departmentId;
  }
  return false;
}

export function canEditTasks(user: UserRow, project: ProjectRow): boolean {
  if (user.systemRole === SystemRole.VIEWER) return false;
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  const role = membership(project.id, user.id)?.role;
  return role === ProjectMemberRole.OWNER || role === ProjectMemberRole.MEMBER;
}

export function canManageMembers(user: UserRow, project: ProjectRow): boolean {
  if (user.systemRole === SystemRole.SUPER_ADMIN) return true;
  if (membership(project.id, user.id)?.role === ProjectMemberRole.OWNER) return true;
  return MANAGER_ROLES.includes(user.systemRole) && user.departmentId === project.departmentId;
}
