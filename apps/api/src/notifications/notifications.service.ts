import type { NotificationDto, Paginated, UnreadCountDto } from '@aionos/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { hasProjectAccess } from '../auth/project-access.rules.js';
import { toIsoDate } from '../common/dates.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { NotificationType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = Prisma.TransactionClient | PrismaService;

export interface NotifyInput {
  recipients: (string | null | undefined)[];
  type: NotificationType;
  actorId: string;
  taskId?: string;
  timesheetId?: string;
  data?: Record<string, string>;
}

const notificationInclude = {
  actor: { select: userSummarySelect },
  task: { select: { id: true, taskNumber: true, title: true, project: { select: { key: true } } } },
  timesheet: { select: { id: true, weekStart: true, user: { select: userSummarySelect } } },
} satisfies Prisma.NotificationInclude;

type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

function toDto(n: NotificationRow): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    actor: n.actor ? toUserSummary(n.actor) : null,
    task: n.task
      ? {
          id: n.task.id,
          key: `${n.task.project.key}-${n.task.taskNumber}`,
          title: n.task.title,
          projectKey: n.task.project.key,
        }
      : null,
    timesheet: n.timesheet
      ? {
          id: n.timesheet.id,
          weekStart: toIsoDate(n.timesheet.weekStart),
          owner: toUserSummary(n.timesheet.user),
        }
      : null,
    data:
      n.data && typeof n.data === 'object' && !Array.isArray(n.data)
        ? (n.data as Record<string, string>)
        : null,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates in-app notifications: never for the actor's own action, never for inactive users,
   * and (for task notifications) only for people who can still see the project.
   * Returns the ids that were notified.
   * TODO(phase-x): fan out to email / Microsoft Teams via Graph.
   */
  async notify(input: NotifyInput, db: Db = this.prisma): Promise<string[]> {
    const ids = [...new Set(input.recipients)].filter(
      (id): id is string => typeof id === 'string' && id !== input.actorId,
    );
    if (ids.length === 0) return [];

    let users = await db.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, systemRole: true, departmentId: true },
    });

    if (input.taskId) {
      const task = await db.task.findUnique({
        where: { id: input.taskId },
        select: { project: { select: { id: true, visibility: true, departmentId: true } } },
      });
      if (!task) return [];
      const memberships = await db.projectMember.findMany({
        where: { projectId: task.project.id, userId: { in: users.map((u) => u.id) } },
        select: { userId: true, role: true },
      });
      const roleOf = new Map(memberships.map((m) => [m.userId, m.role]));
      users = users.filter((u) =>
        hasProjectAccess('view', u, task.project, roleOf.get(u.id) ?? null),
      );
    }

    if (users.length === 0) return [];
    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: input.type,
        actorId: input.actorId,
        taskId: input.taskId ?? null,
        timesheetId: input.timesheetId ?? null,
        data: input.data,
      })),
    });
    return users.map((u) => u.id);
  }

  async list(
    user: AuthUser,
    query: { page: number; pageSize: number; unreadOnly?: boolean },
  ): Promise<Paginated<NotificationDto>> {
    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(rows.map(toDto), total, query);
  }

  async unreadCount(user: AuthUser): Promise<UnreadCountDto> {
    return {
      count: await this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    };
  }

  async markRead(user: AuthUser, id: string): Promise<NotificationDto> {
    const row = await this.prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!row) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: row.readAt ?? new Date() },
      include: notificationInclude,
    });
    return toDto(updated);
  }

  async markAllRead(user: AuthUser): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
