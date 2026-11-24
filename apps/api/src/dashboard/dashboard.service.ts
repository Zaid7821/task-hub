import type { MyStatsDto } from '@aionos/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { addDaysIso, fromIsoDate, mondayOf, round2, toIsoDate, todayIso } from '../common/dates.js';
import { TaskStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const WEEKS = 8;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's delivery over the last 8 ISO weeks (this week included). */
  async myStats(user: AuthUser): Promise<MyStatsDto> {
    const to = todayIso();
    const from = addDaysIso(mondayOf(to), -(WEEKS - 1) * 7);

    const [done, logs] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          assigneeId: user.id,
          status: TaskStatus.DONE,
          completedAt: { gte: fromIsoDate(from) },
        },
        select: { completedAt: true, dueDate: true, estimatePoints: true },
      }),
      this.prisma.timeLog.findMany({
        where: { userId: user.id, workDate: { gte: fromIsoDate(from), lte: fromIsoDate(to) } },
        select: { workDate: true, hours: true },
      }),
    ]);

    const weekly = Array.from({ length: WEEKS }, (_, i) => ({
      weekStart: addDaysIso(from, i * 7),
      tasksDone: 0,
      hoursLogged: 0,
    }));
    const weekOf = (date: string) => weekly.find((w) => w.weekStart === mondayOf(date));

    let withDue = 0;
    let onTime = 0;
    for (const t of done) {
      if (!t.completedAt) continue;
      const completed = toIsoDate(t.completedAt);
      const week = weekOf(completed);
      if (week) week.tasksDone += 1;
      if (t.dueDate) {
        withDue += 1;
        if (completed <= toIsoDate(t.dueDate)) onTime += 1;
      }
    }
    for (const l of logs) {
      const week = weekOf(toIsoDate(l.workDate));
      if (week) week.hoursLogged += l.hours.toNumber();
    }
    for (const w of weekly) w.hoursLogged = round2(w.hoursLogged);

    return {
      from,
      to,
      tasksDone: done.length,
      pointsDelivered: done.reduce((sum, t) => sum + (t.estimatePoints ?? 0), 0),
      hoursLogged: round2(weekly.reduce((sum, w) => sum + w.hoursLogged, 0)),
      onTimeRate: withDue === 0 ? null : Math.round((onTime / withDue) * 100),
      weekly,
    };
  }

  // TODO(phase-x): project summary and employee contribution reports for managers.
}
