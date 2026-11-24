import type { ChecklistItemDto } from '@aionos/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskAccessService } from '../tasks/task-access.service.js';
import type { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist.dto.js';

const MAX_ITEMS = 100;
const POSITION_GAP = 1000;

const itemInclude = { doneBy: { select: userSummarySelect } } satisfies Prisma.ChecklistItemInclude;
type ItemRow = Prisma.ChecklistItemGetPayload<{ include: typeof itemInclude }>;

function toDto(c: ItemRow): ChecklistItemDto {
  return {
    id: c.id,
    taskId: c.taskId,
    title: c.title,
    isDone: c.isDone,
    doneAt: c.doneAt?.toISOString() ?? null,
    doneBy: c.doneBy ? toUserSummary(c.doneBy) : null,
    position: c.position,
  };
}

/** Checklist items are task content: visible to viewers, changed by task editors. */
@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAccess: TaskAccessService,
  ) {}

  async list(user: AuthUser, taskId: string): Promise<ChecklistItemDto[]> {
    const { task } = await this.taskAccess.requireViewable(user, taskId);
    const rows = await this.prisma.checklistItem.findMany({
      where: { taskId: task.id },
      include: itemInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDto);
  }

  async create(
    user: AuthUser,
    taskId: string,
    input: CreateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    const { task } = await this.taskAccess.requireEditable(user, taskId);
    const { _count, _max } = await this.prisma.checklistItem.aggregate({
      where: { taskId: task.id },
      _count: { _all: true },
      _max: { position: true },
    });
    if (_count._all >= MAX_ITEMS) {
      throw new ConflictException(`A checklist can have at most ${MAX_ITEMS} items`);
    }
    const row = await this.prisma.checklistItem.create({
      data: {
        taskId: task.id,
        title: input.title,
        position: Math.max(0, _max.position ?? 0) + POSITION_GAP,
      },
      include: itemInclude,
    });
    return toDto(row);
  }

  private async requireEditableItem(user: AuthUser, itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.taskAccess.requireEditable(user, item.taskId);
    return item;
  }

  async update(
    user: AuthUser,
    itemId: string,
    input: UpdateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    const item = await this.requireEditableItem(user, itemId);
    const data: Prisma.ChecklistItemUncheckedUpdateInput = {
      title: input.title,
      position: input.position,
    };
    if (input.isDone !== undefined && input.isDone !== item.isDone) {
      data.isDone = input.isDone;
      data.doneAt = input.isDone ? new Date() : null;
      data.doneById = input.isDone ? user.id : null;
    }
    const row = await this.prisma.checklistItem.update({
      where: { id: item.id },
      data,
      include: itemInclude,
    });
    return toDto(row);
  }

  async remove(user: AuthUser, itemId: string): Promise<void> {
    const item = await this.requireEditableItem(user, itemId);
    await this.prisma.checklistItem.delete({ where: { id: item.id } });
  }
}
