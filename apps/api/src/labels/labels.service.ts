import { TaskActivityAction, type LabelDto, type TaskDto } from '@aionos/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { hasProjectAccess } from '../auth/project-access.rules.js';
import type { Label, Project } from '../generated/prisma/client.js';
import type { ProjectMemberRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskAccessService } from '../tasks/task-access.service.js';
import { logActivity } from '../tasks/task-activity.js';
import { loadTaskDto, toLabelDto } from '../tasks/task.mapper.js';
import type { CreateLabelDto, SetTaskLabelsDto, UpdateLabelDto } from './dto/label.dto.js';

const MAX_LABELS_PER_PROJECT = 50;

const labelNames = (labels: { name: string }[]): string | null =>
  labels
    .map((l) => l.name)
    .sort()
    .join(', ') || null;

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAccess: TaskAccessService,
  ) {}

  async list(project: Project): Promise<LabelDto[]> {
    const rows = await this.prisma.label.findMany({
      where: { projectId: project.id },
      orderBy: { name: 'asc' },
    });
    return rows.map(toLabelDto);
  }

  private async assertNameFree(projectId: string, name: string, exceptId?: string): Promise<void> {
    const clash = await this.prisma.label.findFirst({
      where: {
        projectId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`Label "${name}" already exists in this project`);
  }

  async create(
    user: AuthUser,
    project: Project,
    memberRole: ProjectMemberRole | null,
    input: CreateLabelDto,
  ): Promise<LabelDto> {
    if (!hasProjectAccess('manage-members', user, project, memberRole)) {
      throw new ForbiddenException('Only project managers can create labels');
    }
    await this.assertNameFree(project.id, input.name);
    const count = await this.prisma.label.count({ where: { projectId: project.id } });
    if (count >= MAX_LABELS_PER_PROJECT) {
      throw new ConflictException(`A project can have at most ${MAX_LABELS_PER_PROJECT} labels`);
    }
    const row = await this.prisma.label.create({
      data: { projectId: project.id, name: input.name, color: input.color },
    });
    return toLabelDto(row);
  }

  /** Labels are managed by people who can manage the project's members. */
  private async requireManageable(user: AuthUser, labelId: string): Promise<Label> {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      include: {
        project: { include: { members: { where: { userId: user.id }, select: { role: true } } } },
      },
    });
    const role = label?.project.members[0]?.role ?? null;
    if (!label || !hasProjectAccess('view', user, label.project, role)) {
      throw new NotFoundException('Label not found');
    }
    if (!hasProjectAccess('manage-members', user, label.project, role)) {
      throw new ForbiddenException('Only project managers can change labels');
    }
    return label;
  }

  async update(user: AuthUser, labelId: string, input: UpdateLabelDto): Promise<LabelDto> {
    const label = await this.requireManageable(user, labelId);
    if (input.name !== undefined) await this.assertNameFree(label.projectId, input.name, label.id);
    const row = await this.prisma.label.update({
      where: { id: label.id },
      data: { name: input.name, color: input.color },
    });
    return toLabelDto(row);
  }

  async remove(user: AuthUser, labelId: string): Promise<void> {
    const label = await this.requireManageable(user, labelId);
    await this.prisma.label.delete({ where: { id: label.id } });
  }

  async setTaskLabels(user: AuthUser, taskId: string, input: SetTaskLabelsDto): Promise<TaskDto> {
    const { task } = await this.taskAccess.requireEditable(user, taskId);
    const ids = [...new Set(input.labelIds)];
    const labels = await this.prisma.label.findMany({
      where: { id: { in: ids }, projectId: task.projectId },
      select: { id: true, name: true },
    });
    if (labels.length !== ids.length) {
      throw new BadRequestException(['labelIds must be labels of this project']);
    }

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.taskLabel.findMany({
        where: { taskId: task.id },
        select: { label: { select: { name: true } } },
      });
      await tx.taskLabel.deleteMany({ where: { taskId: task.id } });
      await tx.taskLabel.createMany({ data: ids.map((labelId) => ({ taskId: task.id, labelId })) });
      const oldText = labelNames(before.map((b) => b.label));
      const newText = labelNames(labels);
      if (oldText !== newText) {
        // Touch updatedAt so the task sorts as recently changed.
        await tx.task.update({ where: { id: task.id }, data: { updatedAt: new Date() } });
        await logActivity(tx, {
          taskId: task.id,
          actorId: user.id,
          action: TaskActivityAction.UPDATED,
          field: 'labels',
          oldValue: oldText,
          newValue: newText,
        });
      }
    });
    return loadTaskDto(this.prisma, task.id);
  }
}
