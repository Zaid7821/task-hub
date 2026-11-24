// Timesheet rules shared by TimesheetsService and TimeLogsService.
import { ConflictException } from '@nestjs/common';
import { fromIsoDate, mondayOf } from '../common/dates.js';
import { TimesheetStatus } from '../generated/prisma/enums.js';
import type { Db } from '../tasks/task.mapper.js';

export const LOCKED_STATUSES: TimesheetStatus[] = [
  TimesheetStatus.SUBMITTED,
  TimesheetStatus.APPROVED,
];

export const WEEK_LOCKED_MESSAGE =
  'That week has been submitted for approval. Ask your approver to reject it if you need to make changes.';

/** Throws 409 when the week containing `workDate` is submitted or approved for this user. */
export async function assertWeekUnlocked(db: Db, userId: string, workDate: string): Promise<void> {
  const sheet = await db.timesheetWeek.findUnique({
    where: { userId_weekStart: { userId, weekStart: fromIsoDate(mondayOf(workDate)) } },
    select: { status: true },
  });
  if (sheet && LOCKED_STATUSES.includes(sheet.status)) {
    throw new ConflictException(WEEK_LOCKED_MESSAGE);
  }
}
