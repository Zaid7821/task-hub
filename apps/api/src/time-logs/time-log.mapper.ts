import type { TimeLogDto } from '@aionos/shared';
import { toIsoDate } from '../common/dates.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';

export const timeLogInclude = {
  user: { select: userSummarySelect },
} satisfies Prisma.TimeLogInclude;
export type TimeLogRow = Prisma.TimeLogGetPayload<{ include: typeof timeLogInclude }>;

export function toTimeLogDto(l: TimeLogRow): TimeLogDto {
  return {
    id: l.id,
    taskId: l.taskId,
    user: toUserSummary(l.user),
    hours: l.hours.toNumber(),
    workDate: toIsoDate(l.workDate),
    note: l.note,
    createdAt: l.createdAt.toISOString(),
  };
}
