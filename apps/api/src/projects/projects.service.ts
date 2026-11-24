import { AuditAction, type Paginated, type ProjectDto } from '@aionos/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import { hasProjectAccess } from '../auth/project-access.rules.js';
import { ROLE_RANK } from '../auth/role-mapper.js';
import { fromIsoDate, toIsoDate } from '../common/dates.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { visibleProjectsWhere } from '../common/project-visibility.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import { Prisma, type Project } from '../generated/prisma/client.js';
import {
  ProjectMemberRole,
  ProjectStatus,
  SystemRole,
  TaskStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './dto/project.dto.js';

const projectInclude = (viewerId: string) =>
  ({
    owner: { select: userSummarySelect },
    department: { select: { id: true, name: true } },
    members: { where: { userId: viewerId }, select: { role: true } },
    _count: { select: { members: true, tasks: true } },
  }) satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: ReturnType<typeof projectInclude> }>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async toDtos(rows: ProjectRow[]): Promise<ProjectDto[]> {
    if (rows.length === 0) return [];
    const done = await this.prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: rows.map((r) => r.id) }, status: TaskStatus.DONE },
      _count: { _all: true },
    });
    const doneBy = new Map(done.map((d) => [d.projectId, d._count._all]));
    return rows.map((p) => {
      const completed = doneBy.get(p.id) ?? 0;
      const total = p._count.tasks;
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        owner: toUserSummary(p.owner),
        department: p.department,
        status: p.status,
        visibility: p.visibility,
        startDate: toIsoDate(p.startDate),
        endDate: toIsoDate(p.endDate),
        memberCount: p._count.members,
        taskCount: total,
        completedTaskCount: completed,
        progress: total === 0 ? 0 : Math.round((completed / total) * 100),
        myRole: p.members[0]?.role ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  private async toDto(id: string, viewerId: string): Promise<ProjectDto> {
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: projectInclude(viewerId),
    });
    if (!row) throw new NotFoundException('Project not found');
    const [dto] = await this.toDtos([row]);
    if (!dto) throw new NotFoundException('Project not found');
    return dto;
  }

  async list(user: AuthUser, query: ProjectQueryDto): Promise<Paginated<ProjectDto>> {
    const where: Prisma.ProjectWhereInput = {
      AND: [
        visibleProjectsWhere(user) ?? {},
        query.status
          ? { status: query.status }
          : query.includeArchived
            ? {}
            : { status: { not: ProjectStatus.ARCHIVED } },
        query.visibility ? { visibility: query.visibility } : {},
        query.departmentId ? { departmentId: query.departmentId } : {},
        query.mine ? { members: { some: { userId: user.id } } } : {},
        query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { key: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const order = query.order ?? 'asc';
    const sort = query.sort ?? 'name';

    if (sort === 'progress') {
      // Progress is derived, so sort in memory. Project counts are small (hundreds, not millions).
      const rows = await this.prisma.project.findMany({ where, include: projectInclude(user.id) });
      const dir = order === 'desc' ? -1 : 1;
      const dtos = (await this.toDtos(rows)).sort(
        (a, b) => dir * (a.progress - b.progress) || a.name.localeCompare(b.name),
      );
      const { skip, take } = pageArgs(query);
      return paginated(dtos.slice(skip, skip + take), dtos.length, query);
    }

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectInclude(user.id),
        orderBy: [{ [sort]: order }, { name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginated(await this.toDtos(rows), total, query);
  }

  async getByKey(user: AuthUser, rawKey: string): Promise<ProjectDto> {
    const key = rawKey.toUpperCase();
    const project = await this.prisma.project.findUnique({
      where: { key },
      include: projectInclude(user.id),
    });
    if (!project) throw new NotFoundException(`Project ${key} not found`);
    if (!hasProjectAccess('view', user, project, project.members[0]?.role ?? null)) {
      throw new ForbiddenException('You do not have access to this project');
    }
    const [dto] = await this.toDtos([project]);
    if (!dto) throw new NotFoundException(`Project ${key} not found`);
    return dto;
  }

  async create(
    user: AuthUser,
    input: CreateProjectDto,
    ip: string | undefined,
  ): Promise<ProjectDto> {
    if (ROLE_RANK[user.systemRole] < ROLE_RANK[SystemRole.MANAGER]) {
      throw new ForbiddenException('Only managers and above can create projects');
    }
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new BadRequestException(['endDate must not be before startDate']);
    }
    const department = await this.prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });
    if (!department) throw new BadRequestException(['departmentId does not exist']);

    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
            key: input.key,
            name: input.name,
            description: input.description ?? null,
            ownerId: user.id,
            departmentId: input.departmentId,
            visibility: input.visibility,
            startDate: input.startDate ? fromIsoDate(input.startDate) : null,
            endDate: input.endDate ? fromIsoDate(input.endDate) : null,
            members: { create: { userId: user.id, role: ProjectMemberRole.OWNER } },
          },
        });
        await this.audit.record(
          {
            actorId: user.id,
            action: AuditAction.PROJECT_CREATED,
            entityType: 'Project',
            entityId: created.id,
            metadata: { key: created.key, name: created.name },
            ipAddress: ip,
          },
          tx,
        );
        return created;
      });
      return this.toDto(project.id, user.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Project key ${input.key} is already in use`);
      }
      throw error;
    }
  }

  async update(
    user: AuthUser,
    project: Project,
    input: UpdateProjectDto,
    ip: string | undefined,
  ): Promise<ProjectDto> {
    // Edits (including archive/restore) need manage-members rights; see ProjectsController.
    const startDate =
      input.startDate === undefined ? toIsoDate(project.startDate) : input.startDate;
    const endDate = input.endDate === undefined ? toIsoDate(project.endDate) : input.endDate;
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(['endDate must not be before startDate']);
    }

    const data: Prisma.ProjectUpdateInput = {
      name: input.name,
      description: input.description === undefined ? undefined : input.description || null,
      status: input.status,
      visibility: input.visibility,
      startDate:
        input.startDate === undefined ? undefined : startDate ? fromIsoDate(startDate) : null,
      endDate: input.endDate === undefined ? undefined : endDate ? fromIsoDate(endDate) : null,
    };
    const changed = Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: project.id }, data });
      const archived =
        input.status === ProjectStatus.ARCHIVED && project.status !== ProjectStatus.ARCHIVED;
      await this.audit.record(
        {
          actorId: user.id,
          action: archived ? AuditAction.PROJECT_ARCHIVED : AuditAction.PROJECT_UPDATED,
          entityType: 'Project',
          entityId: project.id,
          metadata: { key: project.key, fields: changed },
          ipAddress: ip,
        },
        tx,
      );
    });
    return this.toDto(project.id, user.id);
  }

  /** Hard delete (SUPER_ADMIN only). Projects with tasks keep their history: archive instead. */
  async remove(user: AuthUser, project: Project, ip: string | undefined): Promise<void> {
    const tasks = await this.prisma.task.count({ where: { projectId: project.id } });
    if (tasks > 0) {
      throw new ConflictException(
        'This project has tasks and cannot be deleted. Archive it instead.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id: project.id } });
      await this.audit.record(
        {
          actorId: user.id,
          action: AuditAction.PROJECT_DELETED,
          entityType: 'Project',
          entityId: project.id,
          metadata: { key: project.key, name: project.name },
          ipAddress: ip,
        },
        tx,
      );
    });
  }
}
