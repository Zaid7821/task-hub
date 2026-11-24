import { AuditAction, type Paginated, type ProjectMemberDto } from '@aionos/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth-user.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma, Project } from '../generated/prisma/client.js';
import { ProjectMemberRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AddMemberDto, MemberQueryDto, UpdateMemberDto } from './dto/member.dto.js';

const memberInclude = { user: { select: userSummarySelect } } satisfies Prisma.ProjectMemberInclude;
type MemberRow = Prisma.ProjectMemberGetPayload<{ include: typeof memberInclude }>;

function toDto(m: MemberRow): ProjectMemberDto {
  return {
    projectId: m.projectId,
    user: toUserSummary(m.user),
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  };
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Owner first, then members, then viewers; each group by name. */
  async list(project: Project, query: MemberQueryDto): Promise<Paginated<ProjectMemberDto>> {
    const where = { projectId: project.id };
    const [rows, total] = await Promise.all([
      this.prisma.projectMember.findMany({
        where,
        include: memberInclude,
        orderBy: [{ role: 'asc' }, { user: { displayName: 'asc' } }],
        ...pageArgs(query),
      }),
      this.prisma.projectMember.count({ where }),
    ]);
    return paginated(rows.map(toDto), total, query);
  }

  async add(
    actor: AuthUser,
    project: Project,
    input: AddMemberDto,
    ip: string | undefined,
  ): Promise<ProjectMemberDto> {
    const target = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, displayName: true, isActive: true },
    });
    if (!target?.isActive) throw new BadRequestException(['userId must be an active user']);
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: target.id } },
    });
    if (existing) throw new ConflictException(`${target.displayName} is already a member`);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectMember.create({
        data: { projectId: project.id, userId: target.id, role: input.role },
        include: memberInclude,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: AuditAction.MEMBER_ADDED,
          entityType: 'ProjectMember',
          entityId: project.id,
          metadata: { projectKey: project.key, userId: target.id, role: input.role },
          ipAddress: ip,
        },
        tx,
      );
      return created;
    });
    return toDto(row);
  }

  async updateRole(
    actor: AuthUser,
    project: Project,
    userId: string,
    input: UpdateMemberDto,
    ip: string | undefined,
  ): Promise<ProjectMemberDto> {
    const member = await this.requireMember(project, userId);
    if (member.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException("The project owner's role cannot be changed");
    }
    if (member.role === input.role) return toDto(member);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectMember.update({
        where: { projectId_userId: { projectId: project.id, userId } },
        data: { role: input.role },
        include: memberInclude,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: AuditAction.MEMBER_ROLE_CHANGED,
          entityType: 'ProjectMember',
          entityId: project.id,
          metadata: { projectKey: project.key, userId, from: member.role, to: input.role },
          ipAddress: ip,
        },
        tx,
      );
      return updated;
    });
    return toDto(row);
  }

  async remove(
    actor: AuthUser,
    project: Project,
    userId: string,
    ip: string | undefined,
  ): Promise<void> {
    const member = await this.requireMember(project, userId);
    if (member.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('The project owner cannot be removed');
    }
    // TODO(phase-x): decide what happens to tasks still assigned to the removed member.
    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: { projectId_userId: { projectId: project.id, userId } },
      });
      await this.audit.record(
        {
          actorId: actor.id,
          action: AuditAction.MEMBER_REMOVED,
          entityType: 'ProjectMember',
          entityId: project.id,
          metadata: { projectKey: project.key, userId, role: member.role },
          ipAddress: ip,
        },
        tx,
      );
    });
  }

  private async requireMember(project: Project, userId: string): Promise<MemberRow> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      include: memberInclude,
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}
