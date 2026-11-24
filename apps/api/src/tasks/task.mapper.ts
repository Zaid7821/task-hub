import type { LabelDto, TaskDto } from '@aionos/shared';
import { round2, toIsoDate } from '../common/dates.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export type Db = Prisma.TransactionClient | PrismaService;

export const taskDtoInclude = {
  project: { select: { id: true, key: true, name: true } },
  assignee: { select: userSummarySelect },
  reporter: { select: userSummarySelect },
  labels: { select: { label: true } },
  checklist: { select: { isDone: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

export type TaskDtoRow = Prisma.TaskGetPayload<{ include: typeof taskDtoInclude }>;

export function toLabelDto(l: {
  id: string;
  projectId: string;
  name: string;
  color: LabelDto['color'];
}): LabelDto {
  return { id: l.id, projectId: l.projectId, name: l.name, color: l.color };
}

/** Maps task rows to DTOs; logged hours are summed in one grouped query for the whole page. */
export async function toTaskDtos(db: Db, rows: TaskDtoRow[]): Promise<TaskDto[]> {
  if (rows.length === 0) return [];
  const sums = await db.timeLog.groupBy({
    by: ['taskId'],
    where: { taskId: { in: rows.map((r) => r.id) } },
    _sum: { hours: true },
  });
  const hoursBy = new Map(sums.map((s) => [s.taskId, s._sum.hours?.toNumber() ?? 0]));

  return rows.map((t) => ({
    id: t.id,
    key: `${t.project.key}-${t.taskNumber}`,
    taskNumber: t.taskNumber,
    project: t.project,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee ? toUserSummary(t.assignee) : null,
    reporter: toUserSummary(t.reporter),
    estimatePoints: t.estimatePoints,
    estimateHours: t.estimateHours?.toNumber() ?? null,
    dueDate: toIsoDate(t.dueDate),
    startedAt: t.startedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    position: t.position,
    loggedHours: round2(hoursBy.get(t.id) ?? 0),
    commentCount: t._count.comments,
    labels: t.labels.map((tl) => toLabelDto(tl.label)).sort((a, b) => a.name.localeCompare(b.name)),
    checklist: {
      done: t.checklist.filter((c) => c.isDone).length,
      total: t.checklist.length,
    },
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function loadTaskDto(db: Db, id: string): Promise<TaskDto> {
  const row = await db.task.findUniqueOrThrow({ where: { id }, include: taskDtoInclude });
  const [dto] = await toTaskDtos(db, [row]);
  if (!dto) throw new Error(`Task ${id} could not be mapped`);
  return dto;
}
