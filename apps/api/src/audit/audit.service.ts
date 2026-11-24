import type { AuditAction, AuditLogDto, AuditLogListQuery, Paginated } from '@aionos/shared';
import { Injectable } from '@nestjs/common';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = Prisma.TransactionClient | PrismaService;

export interface AuditEntry {
  /** Null for system actions (e.g. Entra role sync, Graph sync). */
  actorId: string | null;
  action: AuditAction;
  entityType: 'User' | 'Project' | 'ProjectMember' | 'Task' | 'TimesheetWeek' | 'System';
  entityId: string;
  metadata?: Prisma.InputJsonObject;
  ipAddress?: string | null;
}

/**
 * The only way to write AuditLog rows. Pass the transaction client when the audited change
 * happens inside a transaction, so the change and its audit entry commit together.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, db: Db = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress?.slice(0, 45) ?? null,
      },
    });
  }

  async list(
    query: AuditLogListQuery & { page: number; pageSize: number },
  ): Promise<Paginated<AuditLogDto>> {
    const where: Prisma.AuditLogWhereInput = {
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: userSummarySelect } },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(
      rows.map((r) => ({
        id: r.id,
        actor: r.actor ? toUserSummary(r.actor) : null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata:
          r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
            ? (r.metadata as Record<string, unknown>)
            : null,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      query,
    );
  }
}
