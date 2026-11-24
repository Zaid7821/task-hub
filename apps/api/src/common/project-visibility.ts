import type { AuthUser } from '../auth/auth-user.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ProjectVisibility, SystemRole } from '../generated/prisma/enums.js';

/**
 * Prisma filter for "projects this user can see" (same rules as hasProjectAccess('view')):
 * SUPER_ADMIN sees all; otherwise PUBLIC, own-department DEPARTMENT projects, or member.
 * Returns undefined when no filter applies.
 */
export function visibleProjectsWhere(user: AuthUser): Prisma.ProjectWhereInput | undefined {
  if (user.systemRole === SystemRole.SUPER_ADMIN) return undefined;
  return {
    OR: [
      { visibility: ProjectVisibility.PUBLIC },
      ...(user.departmentId
        ? [{ visibility: ProjectVisibility.DEPARTMENT, departmentId: user.departmentId }]
        : []),
      { members: { some: { userId: user.id } } },
    ],
  };
}
