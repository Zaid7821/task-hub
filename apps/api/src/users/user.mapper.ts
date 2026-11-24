import type { UserDto } from '@aionos/shared';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Prisma include for everything `toUserDto` needs. */
export const userDtoInclude = {
  department: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  manager: { select: userSummarySelect },
} satisfies Prisma.UserInclude;

export type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userDtoInclude }>;

export function toUserDto(u: UserWithRelations): UserDto {
  return {
    ...toUserSummary(u),
    employeeCode: u.employeeCode,
    department: u.department,
    team: u.team,
    manager: u.manager ? toUserSummary(u.manager) : null,
    systemRole: u.systemRole,
    isActive: u.isActive,
    lastSyncedAt: u.lastSyncedAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
