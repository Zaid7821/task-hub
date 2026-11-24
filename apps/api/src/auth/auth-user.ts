import type { User } from '../generated/prisma/client.js';

/** The authenticated caller, attached to `request.user` by the global AuthGuard. */
export type AuthUser = Pick<
  User,
  'id' | 'entraObjectId' | 'email' | 'displayName' | 'systemRole' | 'departmentId' | 'teamId'
>;

export function toAuthUser(row: User): AuthUser {
  return {
    id: row.id,
    entraObjectId: row.entraObjectId,
    email: row.email,
    displayName: row.displayName,
    systemRole: row.systemRole,
    departmentId: row.departmentId,
    teamId: row.teamId,
  };
}
