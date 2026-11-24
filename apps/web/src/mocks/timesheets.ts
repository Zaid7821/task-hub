// Timesheet rules shared by the timesheet and time-log handlers (mirrors the planned API service).
import {
  SystemRole,
  TaskStatus,
  TimesheetStatus,
  type TimesheetRowDto,
  type TimesheetSummaryDto,
  type TimesheetWeekDto,
} from '@aionos/shared';
import { addDays, db, mondayOf, type TimesheetRow, type UserRow } from './db';
import { toTimeLogDto, toUserSummary, userById } from './serializers';

const LOCKED: TimesheetStatus[] = [TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED];
const round = (n: number) => Math.round(n * 100) / 100;

export function sheetFor(userId: string, weekStart: string): TimesheetRow | undefined {
  return db.timesheets.find((s) => s.userId === userId && s.weekStart === weekStart);
}

/** True when the week containing `workDate` is submitted or approved for this user. */
export function isWeekLocked(userId: string, workDate: string): boolean {
  const sheet = sheetFor(userId, mondayOf(workDate));
  return sheet !== undefined && LOCKED.includes(sheet.status);
}

function logsInWeek(userId: string, weekStart: string) {
  const end = addDays(weekStart, 6);
  return db.timeLogs.filter(
    (l) => l.userId === userId && l.workDate >= weekStart && l.workDate <= end,
  );
}

export function weekTotal(userId: string, weekStart: string): number {
  return round(logsInWeek(userId, weekStart).reduce((sum, l) => sum + l.hours, 0));
}

export function buildWeekDto(owner: UserRow, weekStart: string): TimesheetWeekDto {
  const sheet = sheetFor(owner.id, weekStart);
  const logs = logsInWeek(owner.id, weekStart);
  const open = db.tasks.filter(
    (t) =>
      t.assigneeId === owner.id &&
      (t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW),
  );
  const taskIds = new Set([...logs.map((l) => l.taskId), ...open.map((t) => t.id)]);

  const rows: TimesheetRowDto[] = [...taskIds]
    .map((taskId) => {
      const task = db.tasks.find((t) => t.id === taskId);
      const project = task && db.projects.find((p) => p.id === task.projectId);
      if (!task || !project) return null;
      const taskLogs = logs.filter((l) => l.taskId === taskId);
      const hours = Array.from({ length: 7 }, (_, d) =>
        round(
          taskLogs
            .filter((l) => l.workDate === addDays(weekStart, d))
            .reduce((s, l) => s + l.hours, 0),
        ),
      );
      return {
        task: {
          id: task.id,
          key: `${project.key}-${task.taskNumber}`,
          title: task.title,
          project: { id: project.id, key: project.key, name: project.name },
        },
        hours,
        logs: taskLogs.sort((a, b) => a.workDate.localeCompare(b.workDate)).map(toTimeLogDto),
      };
    })
    .filter((r): r is TimesheetRowDto => r !== null)
    .sort((a, b) => a.task.key.localeCompare(b.task.key, undefined, { numeric: true }));

  const dailyTotals = Array.from({ length: 7 }, (_, d) =>
    round(rows.reduce((sum, r) => sum + (r.hours[d] ?? 0), 0)),
  );
  const approver = userById(sheet?.approverId ?? null);
  return {
    id: sheet?.id ?? null,
    owner: toUserSummary(owner),
    weekStart,
    status: sheet?.status ?? TimesheetStatus.DRAFT,
    submittedAt: sheet?.submittedAt ?? null,
    approver: approver ? toUserSummary(approver) : null,
    decidedAt: sheet?.decidedAt ?? null,
    decisionNote: sheet?.decisionNote ?? null,
    locked: sheet !== undefined && LOCKED.includes(sheet.status),
    totalHours: round(dailyTotals.reduce((a, b) => a + b, 0)),
    dailyTotals,
    rows,
  };
}

export function toSummaryDto(sheet: TimesheetRow): TimesheetSummaryDto | null {
  const owner = userById(sheet.userId);
  if (!owner) return null;
  return {
    id: sheet.id,
    owner: toUserSummary(owner),
    weekStart: sheet.weekStart,
    status: sheet.status,
    totalHours: weekTotal(sheet.userId, sheet.weekStart),
    submittedAt: sheet.submittedAt,
  };
}

/** Manager, else department head, else any other active SUPER_ADMIN. */
export function resolveApprover(user: UserRow): UserRow | undefined {
  const active = (u: UserRow | undefined) => (u && u.isActive && u.id !== user.id ? u : undefined);
  const manager = active(userById(user.managerId));
  if (manager) return manager;
  const department = db.departments.find((d) => d.id === user.departmentId);
  const head = active(userById(department?.headId ?? null));
  if (head) return head;
  return db.users.find((u) => u.systemRole === SystemRole.SUPER_ADMIN && active(u));
}
