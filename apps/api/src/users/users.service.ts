import type { Paginated, UserDto } from '@aionos/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserQueryDto } from './dto/user-query.dto.js';
import { toUserDto, userDtoInclude } from './user.mapper.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthUser): Promise<UserDto> {
    return this.getById(user.id);
  }

  async getById(id: string): Promise<UserDto> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: userDtoInclude });
    if (!row) throw new NotFoundException('User not found');
    return toUserDto(row);
  }

  /** The directory is visible to every signed-in employee (needed for assigning and mentions). */
  async list(query: UserQueryDto): Promise<Paginated<UserDto>> {
    const where: Prisma.UserWhereInput = {
      departmentId: query.departmentId,
      teamId: query.teamId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { jobTitle: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userDtoInclude,
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toUserDto), total, query);
  }

  // TODO(phase-x): SUPER_ADMIN role changes (write USER_ROLE_CHANGED to the audit log).
}
