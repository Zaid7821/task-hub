import {
  TaskActivityAction,
  type BoardDto,
  type Paginated,
  type TaskActivityDto,
  type TaskDto,
  type TaskSortField,
} from '@aionos/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { hasProjectAccess } from '../auth/project-access.rules.js';
import { fromIsoDate, toIsoDate, todayIso } from '../common/dates.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { visibleProjectsWhere } from '../common/project-visibility.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma, Project } from '../generated/prisma/client.js';
import { NotificationType, ProjectMemberRole, TaskStatus } from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ActivityQueryDto,
  ChangeStatusDto,
  CreateTaskDto,
  ReassignDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task.dto.js';
import { asText, logActivity, type ActivityEntry } from './task-activity.js';
import { TaskAccessService } from './task-access.service.js';
import { loadTaskDto, taskDtoInclude, toTaskDtos, type Db } from './task.mapper.js';

const POSITION_GAP = 1000;
const TASK_KEY = /^([A-Z][A-Z0-9]{1,9})-(\d+)$/;
const ASSIGNEE_MESSAGE = 'assignee must be a project member (not a viewer)';

async function endOfColumn(db: Db, projectId: string, status: TaskStatus): Promise<number> {
  const { _max } = await db.task.aggregate({
    where: { projectId, status },
    _max: { position: true },
  });
  return (_max.position ?? 0) + POSITION_GAP;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TaskAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  private async isAssignable(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true, user: { select: { isActive: true } } },
    });
    return (
      member !== null &&
      member.user.isActive &&
      (member.role === ProjectMemberRole.OWNER || member.role === ProjectMemberRole.MEMBER)
    );
  }

  private searchWhere(search: string): Prisma.TaskWhereInput {
    const or: Prisma.TaskWhereInput[] = [
      { title: { contains: search, mode: 'insensitive' } },
      { project: { key: { contains: search, mode: 'insensitive' } } },
    ];
    const key = TASK_KEY.exec(search.toUpperCase());
    if (key) or.push({ project: { key: key[1] }, taskNumber: Number(key[2]) });
    if (/^\d{1,9}$/.test(search)) or.push({ taskNumber: Number(search) });
    return { OR: or };
  }

  async list(user: AuthUser, query: TaskQueryDto): Promise<Paginated<TaskDto>> {
    const assignee = query.assigneeId?.toLowerCase();
    const today = fromIsoDate(todayIso());
    const where: Prisma.TaskWhereInput = {
      AND: [
        { project: visibleProjectsWhere(user) ?? {} },
        query.projectId ? { projectId: query.projectId } : {},
        assignee === 'me'
          ? { assigneeId: user.id }
          : assignee === 'none'
            ? { assigneeId: null }
            : assignee
              ? { assigneeId: assignee }
              : {},
        query.status ? { status: query.status } : {},
        query.priority ? { priority: query.priority } : {},
        query.type ? { type: query.type } : {},
        query.labelId ? { labels: { some: { labelId: query.labelId } } } : {},
        query.dueBefore ? { dueDate: { lte: fromIsoDate(query.dueBefore) } } : {},
        query.overdue ? { status: { not: TaskStatus.DONE }, dueDate: { lt: today } } : {},
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const order = query.order ?? 'asc';
    const tieBreak: Prisma.TaskOrderByWithRelationInput[] = [
      { project: { key: 'asc' } },
      { taskNumber: 'asc' },
    ];
    const sorts: Record<TaskSortField, Prisma.TaskOrderByWithRelationInput[]> = {
      taskNumber: [{ project: { key: order } }, { taskNumber: order }],
      title: [{ title: order }],
      status: [{ status: order }],
      priority: [{ priority: order }],
      // No due date sorts last in ascending order (and first in descending), like the mocks.
      dueDate: [{ dueDate: { sort: order, nulls: order === 'asc' ? 'last' : 'first' } }],
      updatedAt: [{ updatedAt: order }],
    };
    const primary = sorts[query.sort ?? 'taskNumber'];

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: taskDtoInclude,
        orderBy: [...primary, ...tieBreak],
        ...pageArgs(query),
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginated(await toTaskDtos(this.prisma, rows), total, query);
  }

  async getByKey(user: AuthUser, rawKey: string): Promise<TaskDto> {
    const match = TASK_KEY.exec(rawKey.toUpperCase());
    const notFound = new NotFoundException(`Task ${rawKey} not found`);
    if (!match?.[1]) throw notFound;
    const project = await this.prisma.project.findUnique({
      where: { key: match[1] },
      include: { members: { where: { userId: user.id }, select: { role: true } } },
    });
    if (!project) throw notFound;
    const task = await this.prisma.task.findUnique({
      where: { projectId_taskNumber: { projectId: project.id, taskNumber: Number(match[2]) } },
      select: { id: true },
    });
    if (!task) throw notFound;
    if (!hasProjectAccess('view', user, project, project.members[0]?.role ?? null)) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return loadTaskDto(this.prisma, task.id);
  }

  async board(project: Project): Promise<BoardDto> {
    // TODO(phase-x): cap the DONE column (e.g. last 30 days) for very large projects.
    const rows = await this.prisma.task.findMany({
      where: { projectId: project.id },
      include: taskDtoInclude,
      orderBy: [{ position: 'asc' }, { taskNumber: 'asc' }],
    });
    const board: BoardDto = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };
    for (const dto of await toTaskDtos(this.prisma, rows)) board[dto.status].push(dto);
    return board;
  }

  async create(
    user: AuthUser,
    project: Project,
    memberRole: ProjectMemberRole | null,
    input: CreateTaskDto,
  ): Promise<TaskDto> {
    if (!hasProjectAccess('edit-tasks', user, project, memberRole)) {
      throw new ForbiddenException('You cannot create tasks in this project');
    }
    const errors: string[] = [];
    const assigneeId = input.assigneeId ?? null;
    if (assigneeId && !(await this.isAssignable(project.id, assigneeId))) {
      errors.push(ASSIGNEE_MESSAGE);
    }
    const labelIds = [...new Set(input.labelIds ?? [])];
    if (labelIds.length > 0) {
      const found = await this.prisma.label.count({
        where: { id: { in: labelIds }, projectId: project.id },
      });
      if (found !== labelIds.length) errors.push('labelIds must be labels of this project');
    }
    if (errors.length > 0) throw new BadRequestException(errors);

    const taskId = await this.prisma.$transaction(async (tx) => {
      // The increment row-locks the project, so concurrent creates get distinct numbers.
      const { taskCounter } = await tx.project.update({
        where: { id: project.id },
        data: { taskCounter: { increment: 1 } },
        select: { taskCounter: true },
      });
      const task = await tx.task.create({
        data: {
          projectId: project.id,
          taskNumber: taskCounter,
          title: input.title,
          description: input.description || null,
          type: input.type,
          priority: input.priority,
          assigneeId,
          reporterId: user.id,
          estimatePoints: input.estimatePoints ?? null,
          estimateHours: input.estimateHours ?? null,
          dueDate: input.dueDate ? fromIsoDate(input.dueDate) : null,
          position: await endOfColumn(tx, project.id, TaskStatus.TODO),
          labels: { create: labelIds.map((labelId) => ({ labelId })) },
        },
      });
      const entries: ActivityEntry[] = [
        { taskId: task.id, actorId: user.id, action: TaskActivityAction.CREATED },
      ];
      if (assigneeId) {
        entries.push({
          taskId: task.id,
          actorId: user.id,
          action: TaskActivityAction.ASSIGNED,
          field: 'assigneeId',
          newValue: assigneeId,
        });
      }
      await logActivity(tx, ...entries);
      if (assigneeId) {
        await this.notifications.notify(
          {
            recipients: [assigneeId],
            type: NotificationType.TASK_ASSIGNED,
            actorId: user.id,
            taskId: task.id,
          },
          tx,
        );
      }
      return task.id;
    });
    return loadTaskDto(this.prisma, taskId);
  }

  async update(user: AuthUser, taskId: string, input: UpdateTaskDto): Promise<TaskDto> {
    const { task } = await this.access.requireEditable(user, taskId);

    const current = {
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      estimatePoints: task.estimatePoints,
      estimateHours: task.estimateHours?.toNumber() ?? null,
      dueDate: toIsoDate(task.dueDate),
    };
    const next: Partial<typeof current> = {};
    if (input.title !== undefined) next.title = input.title;
    if (input.description !== undefined) next.description = input.description || null;
    if (input.type !== undefined) next.type = input.type;
    if (input.priority !== undefined) next.priority = input.priority;
    if (input.estimatePoints !== undefined) next.estimatePoints = input.estimatePoints;
    if (input.estimateHours !== undefined) next.estimateHours = input.estimateHours;
    if (input.dueDate !== undefined) next.dueDate = input.dueDate;

    const entries: ActivityEntry[] = [];
    const data: Prisma.TaskUpdateInput = {};
    for (const field of Object.keys(next) as (keyof typeof current)[]) {
      const value = next[field] ?? null;
      if (value === current[field]) continue;
      entries.push({
        taskId: task.id,
        actorId: user.id,
        action: TaskActivityAction.UPDATED,
        field,
        oldValue: asText(current[field]),
        newValue: asText(value),
      });
      Object.assign(data, {
        [field]: field === 'dueDate' && value ? fromIsoDate(String(value)) : value,
      });
    }

    if (entries.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id: task.id }, data });
        await logActivity(tx, ...entries);
      });
    }
    return loadTaskDto(this.prisma, task.id);
  }

  async changeStatus(user: AuthUser, taskId: string, input: ChangeStatusDto): Promise<TaskDto> {
    const { task } = await this.access.requireEditable(user, taskId);
    const previous = task.status;
    const changed = previous !== input.status;

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const data: Prisma.TaskUpdateInput = { status: input.status };
      if (input.position !== undefined) data.position = input.position;
      else if (changed) data.position = await endOfColumn(tx, task.projectId, input.status);
      if (changed) {
        if (input.status !== TaskStatus.TODO && !task.startedAt) data.startedAt = now;
        data.completedAt = input.status === TaskStatus.DONE ? now : null;
      }
      await tx.task.update({ where: { id: task.id }, data });
      if (!changed) return;
      await logActivity(tx, {
        taskId: task.id,
        actorId: user.id,
        action: TaskActivityAction.STATUS_CHANGED,
        field: 'status',
        oldValue: previous,
        newValue: input.status,
      });
      await this.notifications.notify(
        {
          recipients: [task.reporterId, task.assigneeId],
          type: NotificationType.STATUS_CHANGED,
          actorId: user.id,
          taskId: task.id,
          data: { from: previous, to: input.status },
        },
        tx,
      );
    });
    return loadTaskDto(this.prisma, task.id);
  }

  async reassign(user: AuthUser, taskId: string, input: ReassignDto): Promise<TaskDto> {
    const { task } = await this.access.requireEditable(user, taskId);
    const next = input.assigneeId ?? null;
    if (next !== null && !(await this.isAssignable(task.projectId, next))) {
      throw new BadRequestException([ASSIGNEE_MESSAGE]);
    }
    if (next !== task.assigneeId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id: task.id }, data: { assigneeId: next } });
        await logActivity(tx, {
          taskId: task.id,
          actorId: user.id,
          action: next ? TaskActivityAction.ASSIGNED : TaskActivityAction.UNASSIGNED,
          field: 'assigneeId',
          oldValue: task.assigneeId,
          newValue: next,
        });
        await this.notifications.notify(
          {
            recipients: [next],
            type: NotificationType.TASK_ASSIGNED,
            actorId: user.id,
            taskId: task.id,
          },
          tx,
        );
      });
    }
    return loadTaskDto(this.prisma, task.id);
  }

  async activity(
    user: AuthUser,
    taskId: string,
    query: ActivityQueryDto,
  ): Promise<Paginated<TaskActivityDto>> {
    const { task } = await this.access.requireViewable(user, taskId);
    const where = { taskId: task.id };
    const [rows, total] = await Promise.all([
      this.prisma.taskActivity.findMany({
        where,
        include: { actor: { select: userSummarySelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(query),
      }),
      this.prisma.taskActivity.count({ where }),
    ]);
    return paginated(
      rows.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        actor: toUserSummary(a.actor),
        // Only TasksService writes this column, always with a TaskActivityAction value.
        action: a.action as TaskActivityAction,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      query,
    );
  }
}
