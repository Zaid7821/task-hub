import type { DepartmentDto, Paginated, TeamDto } from '@aionos/shared';
import { Injectable } from '@nestjs/common';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DepartmentQueryDto, TeamQueryDto } from './dto/org-query.dto.js';

/**
 * Read-only org structure. Departments and teams are owned by Entra / Graph sync.
 * TODO(phase-x): SUPER_ADMIN create/update for departments and teams not covered by Graph.
 */
@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(query: DepartmentQueryDto): Promise<Paginated<DepartmentDto>> {
    const where: Prisma.DepartmentWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        include: {
          head: { select: userSummarySelect },
          parentDepartment: { select: { id: true, name: true } },
          _count: { select: { teams: true, users: { where: { isActive: true } } } },
        },
        orderBy: { name: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.department.count({ where }),
    ]);
    return paginated(
      rows.map((d) => ({
        id: d.id,
        name: d.name,
        head: d.head ? toUserSummary(d.head) : null,
        parentDepartment: d.parentDepartment,
        teamCount: d._count.teams,
        userCount: d._count.users,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total,
      query,
    );
  }

  async listTeams(query: TeamQueryDto): Promise<Paginated<TeamDto>> {
    const where: Prisma.TeamWhereInput = {
      departmentId: query.departmentId,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          lead: { select: userSummarySelect },
          _count: { select: { members: { where: { isActive: true } } } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.team.count({ where }),
    ]);
    return paginated(
      rows.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        lead: t.lead ? toUserSummary(t.lead) : null,
        memberCount: t._count.members,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      total,
      query,
    );
  }
}
