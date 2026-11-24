import type { TimesheetStatus } from '../enums.js';
import type { IsoDate, IsoDateTime, UserSummary } from './common.js';
import type { ProjectRef, TimeLogDto } from './tasks.js';

export interface TimesheetTaskRef {
  id: string;
  key: string;
  title: string;
  project: ProjectRef;
}

/** One task row of the weekly grid. `hours[0]` is Monday ... `hours[6]` is Sunday. */
export interface TimesheetRowDto {
  task: TimesheetTaskRef;
  hours: number[];
  /** The owner's time logs for this task in the week (for the cell detail popover). */
  logs: TimeLogDto[];
}

/**
 * GET /timesheets/me?weekStart=YYYY-MM-DD and GET /timesheets/:id.
 * A week that was never submitted has `id: null` and status DRAFT.
 */
export interface TimesheetWeekDto {
  id: string | null;
  owner: UserSummary;
  /** Monday of the week. */
  weekStart: IsoDate;
  status: TimesheetStatus;
  submittedAt: IsoDateTime | null;
  approver: UserSummary | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
  /** True while SUBMITTED or APPROVED: time logs in this week cannot be added/changed. */
  locked: boolean;
  totalHours: number;
  /** Daily totals, Monday..Sunday. */
  dailyTotals: number[];
  /** Tasks with logs this week, plus the owner's open assigned tasks (for quick logging). */
  rows: TimesheetRowDto[];
}

/** GET /timesheets/approvals (items): weeks awaiting (or decided by) the caller. */
export interface TimesheetSummaryDto {
  id: string;
  owner: UserSummary;
  weekStart: IsoDate;
  status: TimesheetStatus;
  totalHours: number;
  submittedAt: IsoDateTime | null;
}

/** GET /timesheets/approvals */
export interface TimesheetApprovalQuery {
  status?: TimesheetStatus;
}

/** POST /timesheets/me/submit */
export interface SubmitTimesheetInput {
  weekStart: IsoDate;
}

/** POST /timesheets/:id/reject (note required). POST /timesheets/:id/approve takes an optional note. */
export interface TimesheetDecisionInput {
  note?: string;
}
