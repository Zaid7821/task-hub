import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { hasProjectAccess } from '../../auth/project-access.rules.js';
import type { Project } from '../../generated/prisma/client.js';
import type { ProjectMemberRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PROJECT_ACCESS_KEY,
  type ProjectAccessOptions,
} from '../decorators/project-access.decorator.js';

export interface ProjectAccessContext {
  project: Project;
  /** The caller's membership role, or null if not a member. */
  memberRole: ProjectMemberRole | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global guard for @ProjectAccess(). Resolves the project from the route param (UUID or key),
 * applies the shared visibility/membership rules and attaches the result to the request.
 * - Unknown project: 404. Project the caller cannot see: 403 (same as the web mocks).
 * - Visible but insufficient rights for the requested level: 403.
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ProjectAccessOptions | undefined>(
      PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return false;

    const raw = request.params[options.param];
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.prisma.project.findUnique({
      where: UUID.test(raw) ? { id: raw } : { key: raw.toUpperCase() },
    });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      select: { role: true },
    });
    const memberRole = membership?.role ?? null;

    if (!hasProjectAccess('view', user, project, memberRole)) {
      throw new ForbiddenException('You do not have access to this project');
    }
    if (!hasProjectAccess(options.level, user, project, memberRole)) {
      throw new ForbiddenException(
        options.level === 'manage-members'
          ? 'You cannot manage members of this project'
          : 'You cannot edit tasks in this project',
      );
    }

    request.projectAccess = { project, memberRole };
    return true;
  }
}
