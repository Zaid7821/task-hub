import {
  AuditAction,
  type TimesheetRowDto,
  type TimesheetSummaryDto,
  type TimesheetWeekDto,
  type UserSummary,
} from '@aionos/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import {
  addDaysIso,
  fromIsoDate,
  latestClientToday,
  mondayOf,
  round2,
  toIsoDate,
  todayIso,
} from '../common/dates.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import { isRealIsoDate } from '../common/validation.js';
import type { Prisma, TimesheetWeek } from '../generated/prisma/client.js';
import {
  NotificationType,
  SystemRole,
  TaskStatus,
  TimesheetStatus,
} from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { timeLogInclude, toTimeLogDto } from '../time-logs/time-log.mapper.js';
import { LOCKED_STATUSES } from './timesheet-rules.js';

const taskRefSelect = {
  id: true,
  taskNumber: true,
  title: true,
  project: { select: { id: true, key: true, name: true } },
} satisfies Prisma.TaskSelect;

type TaskRef = Prisma.TaskGetPayload<{ select: typeof taskRefSelect }>;

function weekRange(weekStart: string): { gte: Date; lte: Date } {
  return { gte: fromIsoDate(weekStart), lte: fromIsoDate(addDaysIso(weekStart, 6)) };
}

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** A Monday, not in the future (with time-zone slack). Throws 400 otherwise. */
  private requireWeekStart(value: string | undefined): string {
    const weekStart = value ?? mondayOf(todayIso());
    if (!isRealIsoDate(weekStart) || mondayOf(weekStart) !== weekStart) {
      throw new BadRequestException(['weekStart must be a Monday (YYYY-MM-DD)']);
    }
    if (weekStart > mondayOf(latestClientToday())) {
      throw new BadRequestException(['weekStart cannot be in the future']);
    }
    return weekStart;
  }

  private async weekTotal(userId: string, weekStart: string): Promise<number> {
    const { _sum } = await this.prisma.timeLog.aggregate({
      where: { userId, workDate: weekRange(weekStart) },
      _sum: { hours: true },
    });
    return round2(_sum.hours?.toNumber() ?? 0);
  }

  async buildWeek(owner: UserSummary, weekStart: string): Promise<TimesheetWeekDto> {
    const [sheet, logs, open] = await Promise.all([
      this.prisma.timesheetWeek.findUnique({
        where: { userId_weekStart: { userId: owner.id, weekStart: fromIsoDate(weekStart) } },
        include: { approver: { select: userSummarySelect } },
      }),
      this.prisma.timeLog.findMany({
        where: { userId: owner.id, workDate: weekRange(weekStart) },
        include: { ...timeLogInclude, task: { select: taskRefSelect } },
        orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.task.findMany({
        where: {
          assigneeId: owner.id,
          status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW] },
        },
        select: taskRefSelect,
      }),
    ]);

    const tasks = new Map<string, TaskRef>();
    for (const l of logs) tasks.set(l.task.id, l.task);
    for (const t of open) tasks.set(t.id, t);

    const rows: TimesheetRowDto[] = [...tasks.values()]
      .map((task) => {
        const taskLogs = logs.filter((l) => l.taskId === task.id);
        const hours = Array.from({ length: 7 }, (_, d) => {
          const day = addDaysIso(weekStart, d);
          return round2(
            taskLogs
              .filter((l) => toIsoDate(l.workDate) === day)
              .reduce((sum, l) => sum + l.hours.toNumber(), 0),
          );
        });
        return {
          task: {
            id: task.id,
            key: `${task.project.key}-${task.taskNumber}`,
            title: task.title,
            project: task.project,
          },
          hours,
          logs: taskLogs.map(toTimeLogDto),
        };
      })
      .sort((a, b) => a.task.key.localeCompare(b.task.key, undefined, { numeric: true }));

    const dailyTotals = Array.from({ length: 7 }, (_, d) =>
      round2(rows.reduce((sum, r) => sum + (r.hours[d] ?? 0), 0)),
    );
    return {
      id: sheet?.id ?? null,
      owner,
      weekStart,
      status: sheet?.status ?? TimesheetStatus.DRAFT,
      submittedAt: sheet?.submittedAt?.toISOString() ?? null,
      approver: sheet?.approver ? toUserSummary(sheet.approver) : null,
      decidedAt: sheet?.decidedAt?.toISOString() ?? null,
      decisionNote: sheet?.decisionNote ?? null,
      locked: sheet !== null && LOCKED_STATUSES.includes(sheet.status),
      totalHours: round2(dailyTotals.reduce((a, b) => a + b, 0)),
      dailyTotals,
      rows,
    };
  }

  private async summaryOf(userId: string): Promise<UserSummary> {
    return toUserSummary(
      await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: userSummarySelect,
      }),
    );
  }

  async myWeek(user: AuthUser, weekStart: string | undefined): Promise<TimesheetWeekDto> {
    const start = this.requireWeekStart(weekStart);
    return this.buildWeek(await this.summaryOf(user.id), start);
  }

  /** Manager, else department head, else any other active SUPER_ADMIN; never the user. */
  private async resolveApprover(userId: string): Promise<string | null> {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        manager: { select: { id: true, isActive: true } },
        department: { select: { head: { select: { id: true, isActive: true } } } },
      },
    });
    const usable = (u: { id: string; isActive: boolean } | null | undefined) =>
      u && u.isActive && u.id !== userId ? u.id : null;
    const fallback = await this.prisma.user.findFirst({
      where: { systemRole: SystemRole.SUPER_ADMIN, isActive: true, id: { not: userId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return usable(me.manager) ?? usable(me.department?.head) ?? fallback?.id ?? null;
  }

  async submit(user: AuthUser, rawWeekStart: string): Promise<TimesheetWeekDto> {
    const weekStart = this.requireWeekStart(rawWeekStart);
    const key = { userId: user.id, weekStart: fromIsoDate(weekStart) };
    const existing = await this.prisma.timesheetWeek.findUnique({
      where: { userId_weekStart: key },
    });
    if (existing && LOCKED_STATUSES.includes(existing.status)) {
      throw new ConflictException('This week has already been submitted');
    }
    if ((await this.weekTotal(user.id, weekStart)) <= 0) {
      throw new BadRequestException(['Log some time in this week before submitting']);
    }
    const approverId = await this.resolveApprover(user.id);
    if (!approverId) {
      throw new ConflictException('No approver found: ask an administrator to set your manager');
    }

    await this.prisma.$transaction(async (tx) => {
      const fields = {
        status: TimesheetStatus.SUBMITTED,
        submittedAt: new Date(),
        approverId,
        decidedAt: null,
        decisionNote: null,
      };
      const sheet = await tx.timesheetWeek.upsert({
        where: { userId_weekStart: key },
        create: { ...key, ...fields },
        update: fields,
      });
      await this.notifications.notify(
        {
          recipients: [approverId],
          type: NotificationType.TIMESHEET_SUBMITTED,
          actorId: user.id,
          timesheetId: sheet.id,
        },
        tx,
      );
    });
    return this.buildWeek(await this.summaryOf(user.id), weekStart);
  }

  async approvals(
    user: AuthUser,
    status: TimesheetStatus | undefined,
  ): Promise<TimesheetSummaryDto[]> {
    const sheets = await this.prisma.timesheetWeek.findMany({
      where: { approverId: user.id, status: status ?? TimesheetStatus.SUBMITTED },
      include: { user: { select: userSummarySelect } },
      orderBy: [{ weekStart: 'desc' }, { submittedAt: 'asc' }],
      take: 200,
    });
    return Promise.all(
      sheets.map(async (s) => {
        const weekStart = toIsoDate(s.weekStart);
        return {
          id: s.id,
          owner: toUserSummary(s.user),
          weekStart,
          status: s.status,
          totalHours: await this.weekTotal(s.userId, weekStart),
          submittedAt: s.submittedAt?.toISOString() ?? null,
        };
      }),
    );
  }

  async getById(user: AuthUser, id: string): Promise<TimesheetWeekDto> {
    const sheet = await this.prisma.timesheetWeek.findUnique({
      where: { id },
      include: { user: { select: userSummarySelect } },
    });
    const allowed =
      sheet &&
      (sheet.userId === user.id ||
        sheet.approverId === user.id ||
        user.systemRole === SystemRole.SUPER_ADMIN);
    if (!sheet || !allowed) throw new NotFoundException('Timesheet not found');
    return this.buildWeek(toUserSummary(sheet.user), toIsoDate(sheet.weekStart));
  }

  private async requireDecidable(user: AuthUser, id: string): Promise<TimesheetWeek> {
    const sheet = await this.prisma.timesheetWeek.findUnique({ where: { id } });
    const isApprover = sheet?.approverId === user.id || user.systemRole === SystemRole.SUPER_ADMIN;
    if (!sheet || (!isApprover && sheet.userId !== user.id)) {
      throw new NotFoundException('Timesheet not found');
    }
    if (!isApprover) throw new ForbiddenException('Only the approver can decide on this timesheet');
    if (sheet.userId === user.id) {
      throw new ForbiddenException('You cannot decide on your own timesheet');
    }
    if (sheet.status !== TimesheetStatus.SUBMITTED) {
      throw new ConflictException('Only submitted timesheets can be approved or rejected');
    }
    return sheet;
  }

  async decide(
    user: AuthUser,
    id: string,
    decision: 'approve' | 'reject',
    rawNote: string | undefined,
    ip: string | undefined,
  ): Promise<TimesheetWeekDto> {
    const sheet = await this.requireDecidable(user, id);
    const note = rawNote ?? null;
    if (decision === 'reject' && (!note || note.length < 3)) {
      throw new BadRequestException(['A reason (3-1000 characters) is required to reject']);
    }
    const approved = decision === 'approve';

    await this.prisma.$transaction(async (tx) => {
      // Optimistic guard: only one decision wins if two approvers click at once.
      const { count } = await tx.timesheetWeek.updateMany({
        where: { id: sheet.id, status: TimesheetStatus.SUBMITTED },
        data: {
          status: approved ? TimesheetStatus.APPROVED : TimesheetStatus.REJECTED,
          decidedAt: new Date(),
          decisionNote: note,
          approverId: user.id,
        },
      });
      if (count === 0) {
        throw new ConflictException('Only submitted timesheets can be approved or rejected');
      }
      await this.notifications.notify(
        {
          recipients: [sheet.userId],
          type: approved
            ? NotificationType.TIMESHEET_APPROVED
            : NotificationType.TIMESHEET_REJECTED,
          actorId: user.id,
          timesheetId: sheet.id,
          data: approved || !note ? undefined : { note },
        },
        tx,
      );
      await this.audit.record(
        {
          actorId: user.id,
          action: approved ? AuditAction.TIMESHEET_APPROVED : AuditAction.TIMESHEET_REJECTED,
          entityType: 'TimesheetWeek',
          entityId: sheet.id,
          metadata: { ownerId: sheet.userId, weekStart: toIsoDate(sheet.weekStart) },
          ipAddress: ip,
        },
        tx,
      );
    });

    return this.buildWeek(await this.summaryOf(sheet.userId), toIsoDate(sheet.weekStart));
  }
}
