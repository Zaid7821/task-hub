import type { SavedViewDto } from '@aionos/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import type { SavedView } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSavedViewDto } from './dto/saved-view.dto.js';

const MAX_VIEWS = 20;

function toDto(v: SavedView): SavedViewDto {
  return {
    id: v.id,
    name: v.name,
    path: v.path,
    query: v.query,
    createdAt: v.createdAt.toISOString(),
  };
}

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<SavedViewDto[]> {
    const rows = await this.prisma.savedView.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(user: AuthUser, input: CreateSavedViewDto): Promise<SavedViewDto> {
    const mine = await this.prisma.savedView.findMany({
      where: { userId: user.id },
      select: { name: true },
    });
    if (mine.length >= MAX_VIEWS) {
      throw new ConflictException(`You can save at most ${MAX_VIEWS} views`);
    }
    if (mine.some((v) => v.name.toLowerCase() === input.name.toLowerCase())) {
      throw new ConflictException(`You already have a view named "${input.name}"`);
    }
    const row = await this.prisma.savedView.create({
      data: { userId: user.id, name: input.name, path: input.path, query: input.query },
    });
    return toDto(row);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const { count } = await this.prisma.savedView.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) throw new NotFoundException('Saved view not found');
  }
}
