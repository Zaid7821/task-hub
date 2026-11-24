import type { CreateChecklistItemInput, UpdateChecklistItemInput } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { db, newId, nowIso, type ChecklistItemRow } from '../db';
import { apiError, apiPath, currentUser, readJson } from '../http';
import { toChecklistItemDto } from '../serializers';
import { requireEditableTask, requireViewableTask } from '../task-access';

const MAX_ITEMS = 100;

function validTitle(title: unknown): string | null {
  if (typeof title !== 'string') return null;
  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 255 ? trimmed : null;
}

function requireEditableItem(request: Request, itemId: unknown): ChecklistItemRow {
  const user = currentUser(request);
  const item = db.checklist.find((c) => c.id === itemId);
  if (!item) throw apiError(request, 404, 'Checklist item not found');
  requireEditableTask(request, user, item.taskId);
  return item;
}

export const checklistHandlers = [
  http.get(apiPath('/tasks/:taskId/checklist'), ({ request, params }) => {
    const user = currentUser(request);
    const task = requireViewableTask(request, user, params.taskId);
    const rows = db.checklist
      .filter((c) => c.taskId === task.id)
      .sort((a, b) => a.position - b.position);
    return HttpResponse.json(rows.map(toChecklistItemDto));
  }),

  http.post(apiPath('/tasks/:taskId/checklist'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const title = validTitle((await readJson<CreateChecklistItemInput>(request)).title);
    if (!title) return apiError(request, 400, ['title must be 1-255 characters']);
    const items = db.checklist.filter((c) => c.taskId === task.id);
    if (items.length >= MAX_ITEMS) {
      return apiError(request, 409, `A checklist can have at most ${MAX_ITEMS} items`);
    }
    const row: ChecklistItemRow = {
      id: newId(),
      taskId: task.id,
      title,
      isDone: false,
      doneAt: null,
      doneById: null,
      position: Math.max(0, ...items.map((c) => c.position)) + 1000,
      createdAt: nowIso(),
    };
    db.checklist.push(row);
    return HttpResponse.json(toChecklistItemDto(row), { status: 201 });
  }),

  http.patch(apiPath('/checklist-items/:itemId'), async ({ request, params }) => {
    const user = currentUser(request);
    const item = requireEditableItem(request, params.itemId);
    const body = await readJson<UpdateChecklistItemInput>(request);
    if (body.title !== undefined) {
      const title = validTitle(body.title);
      if (!title) return apiError(request, 400, ['title must be 1-255 characters']);
      item.title = title;
    }
    if (body.isDone !== undefined) {
      if (typeof body.isDone !== 'boolean')
        return apiError(request, 400, ['isDone must be a boolean']);
      if (body.isDone !== item.isDone) {
        item.isDone = body.isDone;
        item.doneAt = body.isDone ? nowIso() : null;
        item.doneById = body.isDone ? user.id : null;
      }
    }
    if (body.position !== undefined) {
      if (typeof body.position !== 'number' || !Number.isFinite(body.position)) {
        return apiError(request, 400, ['position must be a number']);
      }
      item.position = body.position;
    }
    return HttpResponse.json(toChecklistItemDto(item));
  }),

  http.delete(apiPath('/checklist-items/:itemId'), ({ request, params }) => {
    const item = requireEditableItem(request, params.itemId);
    db.checklist.splice(db.checklist.indexOf(item), 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
