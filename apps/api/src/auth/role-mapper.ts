import { SystemRole } from '../generated/prisma/enums.js';

export const ROLE_RANK: Record<SystemRole, number> = {
  [SystemRole.VIEWER]: 0,
  [SystemRole.EMPLOYEE]: 1,
  [SystemRole.MANAGER]: 2,
  [SystemRole.DEPARTMENT_HEAD]: 3,
  [SystemRole.SUPER_ADMIN]: 4,
};

const isSystemRole = (value: unknown): value is SystemRole =>
  typeof value === 'string' && value in ROLE_RANK;

/**
 * Maps the Entra `roles` claim (app role values) to a SystemRole. App role values must equal the
 * enum names. With several assigned roles the highest wins; unknown values are ignored.
 * Returns null when the token carries no recognised role (the DB role then applies).
 */
export function mapEntraRoles(roles: unknown): SystemRole | null {
  if (!Array.isArray(roles)) return null;
  const known = roles.filter(isSystemRole);
  if (known.length === 0) return null;
  return known.reduce((best, role) => (ROLE_RANK[role] > ROLE_RANK[best] ? role : best));
}
