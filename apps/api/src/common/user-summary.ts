import type { UserSummary } from '@aionos/shared';

/** Prisma `select` for the UserSummary shape embedded in other DTOs. */
export const userSummarySelect = {
  id: true,
  displayName: true,
  email: true,
  jobTitle: true,
} as const;

export function toUserSummary(u: {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
}): UserSummary {
  return { id: u.id, displayName: u.displayName, email: u.email, jobTitle: u.jobTitle };
}
