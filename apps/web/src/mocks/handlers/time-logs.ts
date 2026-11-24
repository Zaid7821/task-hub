import type { CreateTimeLogInput } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { db, isoDay, newId, nowIso, type TimeLogRow } from '../db';
import { apiError, apiPath, currentUser, paginate, readJson } from '../http';
import { toTimeLogDto } from '../serializers';
import { requireEditableTask, requireViewableTask } from '../task-access';
import { isWeekLocked } from '../timesheets';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCKED_MESSAGE =
  'That week has been submitted for approval. Ask your approver to reject it if you need to make changes.';

function validate(body: Partial<CreateTimeLogInput>): string[] {
  const errors: string[] = [];
  const { hours, workDate, note } = body;
  if (
    typeof hours !== 'number' ||
    hours <= 0 ||
    hours > 24 ||
    Math.round(hours * 4) !== hours * 4
  ) {
    errors.push('hours must be between 0.25 and 24, in steps of 0.25');
  }
  if (typeof workDate !== 'string' || !ISO_DATE.test(workDate)) {
    errors.push('workDate must be a date (YYYY-MM-DD)');
  } else if (workDate > isoDay(0)) {
    errors.push('workDate cannot be in the future');
  }
  if (note !== undefined && (typeof note !== 'string' || note.length > 500)) {
    errors.push('note must be at most 500 characters');
  }
  return errors;
}

export const timeLogHandlers = [
  http.get(apiPath('/tasks/:taskId/time-logs'), ({ request, params }) => {
    const user = currentUser(request);
    const task = requireViewableTask(request, user, params.taskId);
    const rows = db.timeLogs
      .filter((l) => l.taskId === task.id)
      .sort(
        (a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt),
      );
    return HttpResponse.json(paginate(request, rows.map(toTimeLogDto)));
  }),

  http.post(apiPath('/tasks/:taskId/time-logs'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = await readJson<CreateTimeLogInput>(request);
    const errors = validate(body);
    if (errors.length > 0) return apiError(request, 400, errors);
    const input = body as CreateTimeLogInput;
    if (isWeekLocked(user.id, input.workDate)) {
      return apiError(request, 409, LOCKED_MESSAGE);
    }
    const row: TimeLogRow = {
      id: newId(),
      taskId: task.id,
      userId: user.id,
      hours: input.hours,
      workDate: input.workDate,
      note: input.note?.trim() || null,
      createdAt: nowIso(),
    };
    db.timeLogs.push(row);
    return HttpResponse.json(toTimeLogDto(row), { status: 201 });
  }),

  // Own entries only, and only while the week is not submitted/approved.
  // TODO(phase-x): edit (PATCH) own time logs.
  http.delete(apiPath('/time-logs/:logId'), ({ request, params }) => {
    const user = currentUser(request);
    const log = db.timeLogs.find((l) => l.id === params.logId);
    if (!log) return apiError(request, 404, 'Time log not found');
    if (log.userId !== user.id)
      return apiError(request, 403, 'You can only delete your own time logs');
    if (isWeekLocked(user.id, log.workDate)) return apiError(request, 409, LOCKED_MESSAGE);
    db.timeLogs.splice(db.timeLogs.indexOf(log), 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
