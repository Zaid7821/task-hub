import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { hasProjectAccess } from '../auth/project-access.rules.js';
import type { Project, Task } from '../generated/prisma/client.js';
import type { ProjectMemberRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TaskContext {
  task: Task;
  project: Project;
  memberRole: ProjectMemberRole | null;
}

/**
 * Access checks for task-scoped routes (/tasks/:id/...). Tasks in projects the caller cannot
 * see are reported as 404, never 403, so their existence is not revealed.
 */
@Injectable()
export class TaskAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireViewable(user: AuthUser, taskId: string): Promise<TaskContext> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const [project, membership] = await Promise.all([
      this.prisma.project.findUniqueOrThrow({ where: { id: task.projectId } }),
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: user.id } },
        select: { role: true },
      }),
    ]);
    const memberRole = membership?.role ?? null;
    if (!hasProjectAccess('view', user, project, memberRole)) {
      throw new NotFoundException('Task not found');
    }
    return { task, project, memberRole };
  }

  async requireEditable(
    user: AuthUser,
    taskId: string,
    message = 'You cannot edit tasks in this project',
  ): Promise<TaskContext> {
    const ctx = await this.requireViewable(user, taskId);
    if (!hasProjectAccess('edit-tasks', user, ctx.project, ctx.memberRole)) {
      throw new ForbiddenException(message);
    }
    return ctx;
  }
}
