import { NotificationType, SystemRole, type CommentInput } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { canViewProject } from '../access';
import { db, newId, nowIso, type CommentRow } from '../db';
import { apiError, apiPath, currentUser, paginate, readJson } from '../http';
import { excerpt, notify } from '../notify';
import { mentionedUserIds, toCommentDto } from '../serializers';
import { projectOf, requireEditableTask, requireViewableTask } from '../task-access';

const MAX_LENGTH = 10_000;

function validBody(body: Partial<CommentInput>): string | null {
  if (typeof body.body !== 'string' || body.body.trim().length === 0) return null;
  return body.body.length > MAX_LENGTH ? null : body.body.trim();
}

export const commentHandlers = [
  http.get(apiPath('/tasks/:taskId/comments'), ({ request, params }) => {
    const user = currentUser(request);
    const task = requireViewableTask(request, user, params.taskId);
    const rows = db.comments
      .filter((c) => c.taskId === task.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return HttpResponse.json(paginate(request, rows.map(toCommentDto)));
  }),

  http.post(apiPath('/tasks/:taskId/comments'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = validBody(await readJson<CommentInput>(request));
    if (!body) return apiError(request, 400, [`body must be 1-${MAX_LENGTH} characters`]);
    const row: CommentRow = {
      id: newId(),
      taskId: task.id,
      authorId: user.id,
      body,
      editedAt: null,
      createdAt: nowIso(),
    };
    db.comments.push(row);

    // Mentioned people get MENTIONED; the assignee and reporter get COMMENT_ADDED (once each).
    const preview = { excerpt: excerpt(body) };
    const mentioned = notify({
      recipients: mentionedUserIds(body),
      type: NotificationType.MENTIONED,
      actorId: user.id,
      taskId: task.id,
      data: preview,
    });
    notify({
      recipients: [task.assigneeId, task.reporterId].filter((id) => id && !mentioned.includes(id)),
      type: NotificationType.COMMENT_ADDED,
      actorId: user.id,
      taskId: task.id,
      data: preview,
    });
    return HttpResponse.json(toCommentDto(row), { status: 201 });
  }),

  http.patch(apiPath('/comments/:commentId'), async ({ request, params }) => {
    const user = currentUser(request);
    const comment = db.comments.find((c) => c.id === params.commentId);
    const task = comment && db.tasks.find((t) => t.id === comment.taskId);
    if (!comment || !task || !canViewProject(user, projectOf(task))) {
      return apiError(request, 404, 'Comment not found');
    }
    if (comment.authorId !== user.id) {
      return apiError(request, 403, 'Only the author can edit a comment');
    }
    const body = validBody(await readJson<CommentInput>(request));
    if (!body) return apiError(request, 400, [`body must be 1-${MAX_LENGTH} characters`]);
    comment.body = body;
    comment.editedAt = nowIso();
    return HttpResponse.json(toCommentDto(comment));
  }),

  http.delete(apiPath('/comments/:commentId'), ({ request, params }) => {
    const user = currentUser(request);
    const comment = db.comments.find((c) => c.id === params.commentId);
    const task = comment && db.tasks.find((t) => t.id === comment.taskId);
    if (!comment || !task || !canViewProject(user, projectOf(task))) {
      return apiError(request, 404, 'Comment not found');
    }
    if (comment.authorId !== user.id && user.systemRole !== SystemRole.SUPER_ADMIN) {
      return apiError(request, 403, 'Only the author can delete a comment');
    }
    // TODO(phase-x): the real API should soft-delete (comments are contribution history).
    db.comments.splice(db.comments.indexOf(comment), 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
