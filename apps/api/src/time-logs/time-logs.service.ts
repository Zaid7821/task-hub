import type { Paginated, TimeLogDto } from '@aionos/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { fromIsoDate, latestClientToday, toIsoDate } from '../common/dates.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { isRealIsoDate } from '../common/validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskAccessService } from '../tasks/task-access.service.js';
import { assertWeekUnlocked } from '../timesheets/timesheet-rules.js';
import type { CreateTimeLogDto, TimeLogQueryDto } from './dto/time-log.dto.js';
import { timeLogInclude, toTimeLogDto } from './time-log.mapper.js';

@Injectable()
export class TimeLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAccess: TaskAccessService,
  ) {}

  async list(
    user: AuthUser,
    taskId: string,
    query: TimeLogQueryDto,
  ): Promise<Paginated<TimeLogDto>> {
    const { task } = await this.taskAccess.requireViewable(user, taskId);
    const where = { taskId: task.id };
    const [rows, total] = await Promise.all([
      this.prisma.timeLog.findMany({
        where,
        include: timeLogInclude,
        orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
        ...pageArgs(query),
      }),
      this.prisma.timeLog.count({ where }),
    ]);
    return paginated(rows.map(toTimeLogDto), total, query);
  }

  async create(user: AuthUser, taskId: string, input: CreateTimeLogDto): Promise<TimeLogDto> {
    const { task } = await this.taskAccess.requireEditable(user, taskId);
    const errors: string[] = [];
    if (Math.round(input.hours * 4) !== input.hours * 4) {
      errors.push('hours must be between 0.25 and 24, in steps of 0.25');
    }
    if (!isRealIsoDate(input.workDate)) errors.push('workDate must be a date (YYYY-MM-DD)');
    else if (input.workDate > latestClientToday()) errors.push('workDate cannot be in the future');
    if (errors.length > 0) throw new BadRequestException(errors);

    await assertWeekUnlocked(this.prisma, user.id, input.workDate);
    // TODO(phase-x): cap total hours per user per day (e.g. 24h across all tasks).
    const row = await this.prisma.timeLog.create({
      data: {
        taskId: task.id,
        userId: user.id,
        hours: input.hours,
        workDate: fromIsoDate(input.workDate),
        note: input.note ?? null,
      },
      include: timeLogInclude,
    });
    return toTimeLogDto(row);
  }

  /** Own entries only, and only while the week is not submitted/approved. */
  async remove(user: AuthUser, logId: string): Promise<void> {
    const log = await this.prisma.timeLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Time log not found');
    if (log.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own time logs');
    }
    await assertWeekUnlocked(this.prisma, user.id, toIsoDate(log.workDate));
    await this.prisma.timeLog.delete({ where: { id: log.id } });
  }
}
