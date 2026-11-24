import {
  NotificationType,
  SystemRole,
  TimesheetStatus,
  type SubmitTimesheetInput,
  type TimesheetDecisionInput,
} from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { db, isoDay, mondayOf, newId, nowIso, type TimesheetRow } from '../db';
import { apiError, apiPath, currentUser, readJson, searchParam } from '../http';
import { notify } from '../notify';
import { userById } from '../serializers';
import { isEnumValue } from '../task-access';
import { buildWeekDto, resolveApprover, sheetFor, toSummaryDto, weekTotal } from '../timesheets';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates `weekStart` (a Monday, not in the future). Throws a 400 response otherwise. */
function requireWeekStart(request: Request, value: unknown): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || mondayOf(value) !== value) {
    throw apiError(request, 400, ['weekStart must be a Monday (YYYY-MM-DD)']);
  }
  if (value > mondayOf(isoDay(0)))
    throw apiError(request, 400, ['weekStart cannot be in the future']);
  return value;
}

function requireDecidableSheet(request: Request, sheetId: unknown) {
  const user = currentUser(request);
  const sheet = db.timesheets.find((s) => s.id === sheetId);
  const isApprover = sheet?.approverId === user.id || user.systemRole === SystemRole.SUPER_ADMIN;
  if (!sheet || (!isApprover && sheet.userId !== user.id))
    throw apiError(request, 404, 'Timesheet not found');
  if (!isApprover) throw apiError(request, 403, 'Only the approver can decide on this timesheet');
  if (sheet.status !== TimesheetStatus.SUBMITTED) {
    throw apiError(request, 409, 'Only submitted timesheets can be approved or rejected');
  }
  return { user, sheet };
}

export const timesheetHandlers = [
  // Literal routes first, then /timesheets/:id.
  http.get(apiPath('/timesheets/me'), ({ request }) => {
    const user = currentUser(request);
    const weekStart = requireWeekStart(
      request,
      searchParam(request, 'weekStart') ?? mondayOf(isoDay(0)),
    );
    return HttpResponse.json(buildWeekDto(user, weekStart));
  }),

  http.post(apiPath('/timesheets/me/submit'), async ({ request }) => {
    const user = currentUser(request);
    const weekStart = requireWeekStart(
      request,
      (await readJson<SubmitTimesheetInput>(request)).weekStart,
    );
    const existing = sheetFor(user.id, weekStart);
    if (
      existing &&
      existing.status !== TimesheetStatus.DRAFT &&
      existing.status !== TimesheetStatus.REJECTED
    ) {
      return apiError(request, 409, 'This week has already been submitted');
    }
    if (weekTotal(user.id, weekStart) <= 0) {
      return apiError(request, 400, ['Log some time in this week before submitting']);
    }
    const approver = resolveApprover(user);
    if (!approver)
      return apiError(request, 409, 'No approver found: ask an administrator to set your manager');

    const now = nowIso();
    const sheet: TimesheetRow = existing ?? {
      id: newId(),
      userId: user.id,
      weekStart,
      status: TimesheetStatus.DRAFT,
      submittedAt: null,
      approverId: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: now,
    };
    Object.assign(sheet, {
      status: TimesheetStatus.SUBMITTED,
      submittedAt: now,
      approverId: approver.id,
      decidedAt: null,
      decisionNote: null,
    });
    if (!existing) db.timesheets.push(sheet);
    notify({
      recipients: [approver.id],
      type: NotificationType.TIMESHEET_SUBMITTED,
      actorId: user.id,
      timesheetId: sheet.id,
    });
    return HttpResponse.json(buildWeekDto(user, weekStart));
  }),

  http.get(apiPath('/timesheets/approvals'), ({ request }) => {
    const user = currentUser(request);
    const raw = searchParam(request, 'status');
    const status = isEnumValue(TimesheetStatus, raw) ? raw : TimesheetStatus.SUBMITTED;
    const rows = db.timesheets
      .filter((s) => s.approverId === user.id && s.status === status)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      .map(toSummaryDto)
      .filter((s) => s !== null);
    return HttpResponse.json(rows);
  }),

  http.get(apiPath('/timesheets/:sheetId'), ({ request, params }) => {
    const user = currentUser(request);
    const sheet = db.timesheets.find((s) => s.id === params.sheetId);
    const allowed =
      sheet &&
      (sheet.userId === user.id ||
        sheet.approverId === user.id ||
        user.systemRole === SystemRole.SUPER_ADMIN);
    const owner = sheet && userById(sheet.userId);
    if (!sheet || !allowed || !owner) return apiError(request, 404, 'Timesheet not found');
    return HttpResponse.json(buildWeekDto(owner, sheet.weekStart));
  }),

  http.post(apiPath('/timesheets/:sheetId/approve'), async ({ request, params }) => {
    const { user, sheet } = requireDecidableSheet(request, params.sheetId);
    const note = (await readJson<TimesheetDecisionInput>(request)).note?.trim() || null;
    Object.assign(sheet, {
      status: TimesheetStatus.APPROVED,
      decidedAt: nowIso(),
      decisionNote: note,
      approverId: user.id,
    });
    notify({
      recipients: [sheet.userId],
      type: NotificationType.TIMESHEET_APPROVED,
      actorId: user.id,
      timesheetId: sheet.id,
    });
    // TODO(phase-x): AuditLog TIMESHEET_APPROVED.
    const owner = userById(sheet.userId);
    return owner
      ? HttpResponse.json(buildWeekDto(owner, sheet.weekStart))
      : apiError(request, 404, 'Owner not found');
  }),

  http.post(apiPath('/timesheets/:sheetId/reject'), async ({ request, params }) => {
    const { user, sheet } = requireDecidableSheet(request, params.sheetId);
    const note = (await readJson<TimesheetDecisionInput>(request)).note?.trim() ?? '';
    if (note.length < 3 || note.length > 1000) {
      return apiError(request, 400, ['A reason (3-1000 characters) is required to reject']);
    }
    Object.assign(sheet, {
      status: TimesheetStatus.REJECTED,
      decidedAt: nowIso(),
      decisionNote: note,
      approverId: user.id,
    });
    notify({
      recipients: [sheet.userId],
      type: NotificationType.TIMESHEET_REJECTED,
      actorId: user.id,
      timesheetId: sheet.id,
      data: { note },
    });
    const owner = userById(sheet.userId);
    return owner
      ? HttpResponse.json(buildWeekDto(owner, sheet.weekStart))
      : apiError(request, 404, 'Owner not found');
  }),
];
