import { MENTION_PATTERN, type CommentDto, type Paginated, type UserSummary } from '@aionos/shared';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { pageArgs, paginated } from '../common/pagination/paginate.js';
import { toUserSummary, userSummarySelect } from '../common/user-summary.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NotificationType, SystemRole } from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TaskAccessService } from '../tasks/task-access.service.js';
import type { CommentBodyDto, CommentQueryDto } from './dto/comment.dto.js';

const commentInclude = { author: { select: userSummarySelect } } satisfies Prisma.CommentInclude;
type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

/** Distinct user ids mentioned as `<@id>`, in order of appearance. */
export function mentionedUserIds(body: string): string[] {
  // Fresh RegExp: the shared global pattern keeps `lastIndex` state between calls.
  const pattern = new RegExp(MENTION_PATTERN.source, 'gi');
  return [...new Set([...body.matchAll(pattern)].map((m) => (m[1] ?? '').toLowerCase()))];
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAccess: TaskAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  private async usersById(ids: string[]): Promise<Map<string, UserSummary>> {
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: userSummarySelect,
    });
    return new Map(users.map((u) => [u.id, toUserSummary(u)]));
  }

  private async toDtos(rows: CommentRow[]): Promise<CommentDto[]> {
    const users = await this.usersById([...new Set(rows.flatMap((r) => mentionedUserIds(r.body)))]);
    return rows.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      author: toUserSummary(c.author),
      body: c.body,
      mentions: mentionedUserIds(c.body)
        .map((id) => users.get(id))
        .filter((u): u is UserSummary => u !== undefined),
      editedAt: c.editedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  private async toDto(row: CommentRow): Promise<CommentDto> {
    const [dto] = await this.toDtos([row]);
    if (!dto) throw new NotFoundException('Comment not found');
    return dto;
  }

  /** Short plain-text preview for notifications (mentions shown as @Name). */
  private async excerpt(body: string, max = 120): Promise<string> {
    const users = await this.usersById(mentionedUserIds(body));
    const text = body
      .replace(
        new RegExp(MENTION_PATTERN.source, 'gi'),
        (_m, id: string) => `@${users.get(id.toLowerCase())?.displayName ?? 'someone'}`,
      )
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  async list(
    user: AuthUser,
    taskId: string,
    query: CommentQueryDto,
  ): Promise<Paginated<CommentDto>> {
    const { task } = await this.taskAccess.requireViewable(user, taskId);
    const where = { taskId: task.id };
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: commentInclude,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.comment.count({ where }),
    ]);
    return paginated(await this.toDtos(rows), total, query);
  }

  async create(user: AuthUser, taskId: string, input: CommentBodyDto): Promise<CommentDto> {
    const { task } = await this.taskAccess.requireEditable(user, taskId);
    const preview = { excerpt: await this.excerpt(input.body) };

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { taskId: task.id, authorId: user.id, body: input.body },
        include: commentInclude,
      });
      // Mentioned people get MENTIONED; the assignee and reporter get COMMENT_ADDED (once each).
      const mentioned = await this.notifications.notify(
        {
          recipients: mentionedUserIds(input.body),
          type: NotificationType.MENTIONED,
          actorId: user.id,
          taskId: task.id,
          data: preview,
        },
        tx,
      );
      await this.notifications.notify(
        {
          recipients: [task.assigneeId, task.reporterId].filter(
            (id) => id && !mentioned.includes(id),
          ),
          type: NotificationType.COMMENT_ADDED,
          actorId: user.id,
          taskId: task.id,
          data: preview,
        },
        tx,
      );
      return created;
    });
    return this.toDto(row);
  }

  private async requireVisibleComment(user: AuthUser, commentId: string): Promise<CommentRow> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: commentInclude,
    });
    if (!comment) throw new NotFoundException('Comment not found');
    try {
      await this.taskAccess.requireViewable(user, comment.taskId);
    } catch {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async update(user: AuthUser, commentId: string, input: CommentBodyDto): Promise<CommentDto> {
    const comment = await this.requireVisibleComment(user, commentId);
    if (comment.authorId !== user.id) {
      throw new ForbiddenException('Only the author can edit a comment');
    }
    // TODO(phase-x): notify people newly mentioned by an edit.
    const row = await this.prisma.comment.update({
      where: { id: comment.id },
      data: { body: input.body, editedAt: new Date() },
      include: commentInclude,
    });
    return this.toDto(row);
  }

  async remove(user: AuthUser, commentId: string): Promise<void> {
    const comment = await this.requireVisibleComment(user, commentId);
    if (comment.authorId !== user.id && user.systemRole !== SystemRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only the author can delete a comment');
    }
    // TODO(phase-x): soft-delete instead, since comments are contribution history.
    await this.prisma.comment.delete({ where: { id: comment.id } });
  }
}
