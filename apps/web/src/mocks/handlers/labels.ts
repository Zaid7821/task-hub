import {
  LabelColor,
  TaskActivityAction,
  type CreateLabelInput,
  type SetTaskLabelsInput,
  type UpdateLabelInput,
} from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { canManageMembers, canViewProject } from '../access';
import { db, newId, nowIso, type LabelRow } from '../db';
import { apiError, apiPath, currentUser, readJson, requireViewableProject } from '../http';
import { toLabelDto, toTaskDto } from '../serializers';
import { isEnumValue, logActivity, projectOf, requireEditableTask } from '../task-access';

const MAX_LABELS_PER_PROJECT = 50;

function requireManageableLabel(request: Request, labelId: unknown) {
  const user = currentUser(request);
  const label = db.labels.find((l) => l.id === labelId);
  const project = label ? db.projects.find((p) => p.id === label.projectId) : undefined;
  if (!label || !project || !canViewProject(user, project)) {
    throw apiError(request, 404, 'Label not found');
  }
  if (!canManageMembers(user, project)) {
    throw apiError(request, 403, 'Only project managers can change labels');
  }
  return label;
}

function validName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 40 ? trimmed : null;
}

const labelNames = (ids: string[]) =>
  ids
    .map((id) => db.labels.find((l) => l.id === id)?.name)
    .filter(Boolean)
    .sort()
    .join(', ') || null;

export const labelHandlers = [
  http.get(apiPath('/projects/:projectId/labels'), ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    const rows = db.labels
      .filter((l) => l.projectId === project.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(rows.map(toLabelDto));
  }),

  http.post(apiPath('/projects/:projectId/labels'), async ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    if (!canManageMembers(user, project)) {
      return apiError(request, 403, 'Only project managers can create labels');
    }
    const body = await readJson<CreateLabelInput>(request);
    const name = validName(body.name);
    if (!name || !isEnumValue(LabelColor, body.color)) {
      return apiError(request, 400, ['name must be 1-40 characters', 'color is invalid']);
    }
    const existing = db.labels.filter((l) => l.projectId === project.id);
    if (existing.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      return apiError(request, 409, `Label "${name}" already exists in this project`);
    }
    if (existing.length >= MAX_LABELS_PER_PROJECT) {
      return apiError(request, 409, `A project can have at most ${MAX_LABELS_PER_PROJECT} labels`);
    }
    const row: LabelRow = {
      id: newId(),
      projectId: project.id,
      name,
      color: body.color,
      createdAt: nowIso(),
    };
    db.labels.push(row);
    return HttpResponse.json(toLabelDto(row), { status: 201 });
  }),

  http.patch(apiPath('/labels/:labelId'), async ({ request, params }) => {
    const label = requireManageableLabel(request, params.labelId);
    const body = await readJson<UpdateLabelInput>(request);
    if (body.name !== undefined) {
      const name = validName(body.name);
      if (!name) return apiError(request, 400, ['name must be 1-40 characters']);
      const clash = db.labels.some(
        (l) =>
          l.projectId === label.projectId &&
          l.id !== label.id &&
          l.name.toLowerCase() === name.toLowerCase(),
      );
      if (clash) return apiError(request, 409, `Label "${name}" already exists in this project`);
      label.name = name;
    }
    if (body.color !== undefined) {
      if (!isEnumValue(LabelColor, body.color)) return apiError(request, 400, ['color is invalid']);
      label.color = body.color;
    }
    return HttpResponse.json(toLabelDto(label));
  }),

  http.delete(apiPath('/labels/:labelId'), ({ request, params }) => {
    const label = requireManageableLabel(request, params.labelId);
    db.labels.splice(db.labels.indexOf(label), 1);
    db.taskLabels = db.taskLabels.filter((tl) => tl.labelId !== label.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(apiPath('/tasks/:taskId/labels'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = await readJson<SetTaskLabelsInput>(request);
    const ids = Array.isArray(body.labelIds) ? [...new Set(body.labelIds)] : null;
    const projectId = projectOf(task).id;
    if (
      !ids ||
      ids.some(
        (id) =>
          typeof id !== 'string' ||
          !db.labels.some((l) => l.id === id && l.projectId === projectId),
      )
    ) {
      return apiError(request, 400, ['labelIds must be labels of this project']);
    }
    const before = db.taskLabels.filter((tl) => tl.taskId === task.id).map((tl) => tl.labelId);
    db.taskLabels = [
      ...db.taskLabels.filter((tl) => tl.taskId !== task.id),
      ...ids.map((labelId) => ({ taskId: task.id, labelId })),
    ];
    const oldText = labelNames(before);
    const newText = labelNames(ids);
    if (oldText !== newText) {
      task.updatedAt = nowIso();
      logActivity(task, user.id, TaskActivityAction.UPDATED, 'labels', oldText, newText);
    }
    return HttpResponse.json(toTaskDto(task));
  }),
];
