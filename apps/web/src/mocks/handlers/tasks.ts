import {
  NotificationType,
  ProjectMemberRole,
  TaskActivityAction,
  TaskPriority,
  TaskStatus,
  TaskType,
  type BoardDto,
  type ChangeTaskStatusInput,
  type CreateTaskInput,
  type ReassignTaskInput,
  type TaskDto,
  type TaskSortField,
  type UpdateTaskInput,
} from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { canEditTasks, canViewProject, membership } from '../access';
import { db, isoDay, newId, nowIso, type ProjectRow, type TaskRow } from '../db';
import {
  apiError,
  apiPath,
  currentUser,
  matchesSearch,
  paginate,
  readJson,
  requireViewableProject,
  searchParam,
} from '../http';
import { notify } from '../notify';
import { toActivityDto, toTaskDto } from '../serializers';
import {
  isEnumValue,
  logActivity,
  projectOf,
  requireEditableTask,
  requireViewableTask,
} from '../task-access';

const STATUS_ORDER = Object.values(TaskStatus);
const PRIORITY_ORDER = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.CRITICAL,
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TASK_KEY = /^([A-Z][A-Z0-9]{1,9})-(\d+)$/;
const POSITION_GAP = 1000;

const SORTERS: Record<TaskSortField, (a: TaskDto, b: TaskDto) => number> = {
  taskNumber: (a, b) => a.project.key.localeCompare(b.project.key) || a.taskNumber - b.taskNumber,
  title: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  priority: (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  // Tasks without a due date sort last in ascending order.
  dueDate: (a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'),
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

function endOfColumn(projectId: string, status: TaskStatus): number {
  const positions = db.tasks
    .filter((t) => t.projectId === projectId && t.status === status)
    .map((t) => t.position);
  return (positions.length ? Math.max(...positions) : 0) + POSITION_GAP;
}

function isAssignable(project: ProjectRow, userId: string): boolean {
  const role = membership(project.id, userId)?.role;
  return role === ProjectMemberRole.OWNER || role === ProjectMemberRole.MEMBER;
}

/** Validates the fields present in `body`. With `requireAll`, title/type/priority are mandatory. */
function validateFields(
  project: ProjectRow,
  body: Partial<CreateTaskInput>,
  requireAll: boolean,
): string[] {
  const errors: string[] = [];
  const has = (k: keyof CreateTaskInput) => requireAll || body[k] !== undefined;
  if (
    has('title') &&
    (typeof body.title !== 'string' || body.title.trim().length < 3 || body.title.length > 255)
  ) {
    errors.push('title must be between 3 and 255 characters');
  }
  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== 'string'
  ) {
    errors.push('description must be a string');
  }
  if (has('type') && !isEnumValue(TaskType, body.type)) errors.push('type is invalid');
  if (has('priority') && !isEnumValue(TaskPriority, body.priority))
    errors.push('priority is invalid');
  if (
    body.assigneeId !== undefined &&
    body.assigneeId !== null &&
    !isAssignable(project, body.assigneeId)
  ) {
    errors.push('assignee must be a project member (not a viewer)');
  }
  const points = body.estimatePoints;
  if (
    points !== undefined &&
    points !== null &&
    (!Number.isInteger(points) || points < 0 || points > 100)
  ) {
    errors.push('estimatePoints must be an integer between 0 and 100');
  }
  const hours = body.estimateHours;
  if (
    hours !== undefined &&
    hours !== null &&
    (typeof hours !== 'number' || hours < 0 || hours > 999)
  ) {
    errors.push('estimateHours must be between 0 and 999');
  }
  if (
    body.dueDate !== undefined &&
    body.dueDate !== null &&
    (typeof body.dueDate !== 'string' || !ISO_DATE.test(body.dueDate))
  ) {
    errors.push('dueDate must be a date (YYYY-MM-DD)');
  }
  if (
    body.labelIds !== undefined &&
    (!Array.isArray(body.labelIds) ||
      body.labelIds.some((id) => !db.labels.some((l) => l.id === id && l.projectId === project.id)))
  ) {
    errors.push('labelIds must be labels of this project');
  }
  return errors;
}

const asText = (v: string | number | null | undefined): string | null =>
  v === null || v === undefined ? null : String(v);

export const taskHandlers = [
  http.get(apiPath('/tasks'), ({ request }) => {
    const user = currentUser(request);
    const projectId = searchParam(request, 'projectId');
    const rawAssignee = searchParam(request, 'assigneeId');
    const assigneeId = rawAssignee === 'me' ? user.id : rawAssignee;
    const status = searchParam(request, 'status');
    const priority = searchParam(request, 'priority');
    const type = searchParam(request, 'type');
    const labelId = searchParam(request, 'labelId');
    const search = searchParam(request, 'search');
    const dueBefore = searchParam(request, 'dueBefore');
    const overdue = searchParam(request, 'overdue') === 'true';
    const sortParam = searchParam(request, 'sort');
    const sort: TaskSortField =
      sortParam && sortParam in SORTERS ? (sortParam as TaskSortField) : 'taskNumber';
    const direction = searchParam(request, 'order') === 'desc' ? -1 : 1;
    const today = isoDay(0);

    const visibleProjects = new Set(
      db.projects.filter((p) => canViewProject(user, p)).map((p) => p.id),
    );
    const dtos = db.tasks
      .filter((t) => visibleProjects.has(t.projectId))
      .filter((t) => !projectId || t.projectId === projectId)
      .filter(
        (t) =>
          !assigneeId ||
          (assigneeId === 'none' ? t.assigneeId === null : t.assigneeId === assigneeId),
      )
      .filter((t) => !status || t.status === status)
      .filter((t) => !priority || t.priority === priority)
      .filter((t) => !type || t.type === type)
      .filter(
        (t) => !labelId || db.taskLabels.some((tl) => tl.taskId === t.id && tl.labelId === labelId),
      )
      .filter((t) => !dueBefore || (t.dueDate !== null && t.dueDate <= dueBefore))
      .filter(
        (t) =>
          !overdue || (t.status !== TaskStatus.DONE && t.dueDate !== null && t.dueDate < today),
      )
      .map(toTaskDto)
      .filter((t) => matchesSearch(search, t.title, t.key))
      .sort((a, b) => direction * SORTERS[sort](a, b) || SORTERS.taskNumber(a, b));

    return HttpResponse.json(paginate(request, dtos));
  }),

  http.get(apiPath('/tasks/by-key/:key'), ({ request, params }) => {
    const user = currentUser(request);
    const match = TASK_KEY.exec(String(params.key).toUpperCase());
    const project = match ? db.projects.find((p) => p.key === match[1]) : undefined;
    const task =
      project &&
      db.tasks.find((t) => t.projectId === project.id && t.taskNumber === Number(match?.[2]));
    if (!project || !task) return apiError(request, 404, `Task ${String(params.key)} not found`);
    if (!canViewProject(user, project)) {
      return apiError(request, 403, 'You do not have access to this project');
    }
    return HttpResponse.json(toTaskDto(task));
  }),

  http.get(apiPath('/projects/:projectId/board'), ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    // TODO(phase-x): the real API may cap the DONE column (e.g. last 30 days) for large projects.
    const board = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as TaskDto[]])) as BoardDto;
    for (const task of db.tasks.filter((t) => t.projectId === project.id)) {
      board[task.status].push(toTaskDto(task));
    }
    for (const status of STATUS_ORDER) board[status].sort((a, b) => a.position - b.position);
    return HttpResponse.json(board);
  }),

  http.post(apiPath('/projects/:projectId/tasks'), async ({ request, params }) => {
    const user = currentUser(request);
    const project = requireViewableProject(request, user, params.projectId, canViewProject);
    if (!canEditTasks(user, project)) {
      return apiError(request, 403, 'You cannot create tasks in this project');
    }
    const body = await readJson<CreateTaskInput>(request);
    const errors = validateFields(project, body, true);
    if (errors.length > 0) return apiError(request, 400, errors);
    const input = body as CreateTaskInput;

    // The real API increments taskCounter inside a transaction.
    project.taskCounter += 1;
    const now = nowIso();
    const task: TaskRow = {
      id: newId(),
      projectId: project.id,
      taskNumber: project.taskCounter,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      status: TaskStatus.TODO,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      reporterId: user.id,
      estimatePoints: input.estimatePoints ?? null,
      estimateHours: input.estimateHours ?? null,
      dueDate: input.dueDate ?? null,
      startedAt: null,
      completedAt: null,
      position: endOfColumn(project.id, TaskStatus.TODO),
      createdAt: now,
      updatedAt: now,
    };
    db.tasks.push(task);
    for (const labelId of new Set(input.labelIds ?? []))
      db.taskLabels.push({ taskId: task.id, labelId });
    logActivity(task, user.id, TaskActivityAction.CREATED);
    if (task.assigneeId) {
      logActivity(task, user.id, TaskActivityAction.ASSIGNED, 'assigneeId', null, task.assigneeId);
      notify({
        recipients: [task.assigneeId],
        type: NotificationType.TASK_ASSIGNED,
        actorId: user.id,
        taskId: task.id,
      });
    }

    return HttpResponse.json(toTaskDto(task), { status: 201 });
  }),

  http.patch(apiPath('/tasks/:taskId'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = await readJson<UpdateTaskInput>(request);
    const errors = validateFields(projectOf(task), body as Partial<CreateTaskInput>, false);
    if (errors.length > 0) return apiError(request, 400, errors);

    const fields = [
      'title',
      'description',
      'type',
      'priority',
      'estimatePoints',
      'estimateHours',
      'dueDate',
    ] as const;
    for (const field of fields) {
      const raw = body[field];
      if (raw === undefined) continue;
      const next = typeof raw === 'string' ? raw.trim() || (field === 'title' ? raw : null) : raw;
      if (next === task[field]) continue;
      const previous = task[field];
      Object.assign(task, { [field]: next });
      logActivity(task, user.id, TaskActivityAction.UPDATED, field, asText(previous), asText(next));
    }
    task.updatedAt = nowIso();
    return HttpResponse.json(toTaskDto(task));
  }),

  http.patch(apiPath('/tasks/:taskId/status'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = await readJson<ChangeTaskStatusInput>(request);
    if (!isEnumValue(TaskStatus, body.status)) return apiError(request, 400, ['status is invalid']);
    if (
      body.position !== undefined &&
      (typeof body.position !== 'number' || !Number.isFinite(body.position))
    ) {
      return apiError(request, 400, ['position must be a number']);
    }

    const previous = task.status;
    const now = nowIso();
    task.status = body.status;
    if (body.position !== undefined) task.position = body.position;
    else if (previous !== task.status) task.position = endOfColumn(task.projectId, body.status);
    if (previous !== task.status) {
      if (task.status !== TaskStatus.TODO && !task.startedAt) task.startedAt = now;
      task.completedAt = task.status === TaskStatus.DONE ? now : null;
      logActivity(
        task,
        user.id,
        TaskActivityAction.STATUS_CHANGED,
        'status',
        previous,
        task.status,
      );
      notify({
        recipients: [task.reporterId, task.assigneeId],
        type: NotificationType.STATUS_CHANGED,
        actorId: user.id,
        taskId: task.id,
        data: { from: previous, to: task.status },
      });
    }
    task.updatedAt = now;
    return HttpResponse.json(toTaskDto(task));
  }),

  http.patch(apiPath('/tasks/:taskId/assignee'), async ({ request, params }) => {
    const user = currentUser(request);
    const task = requireEditableTask(request, user, params.taskId);
    const body = await readJson<ReassignTaskInput>(request);
    const next = body.assigneeId ?? null;
    if (next !== null && (typeof next !== 'string' || !isAssignable(projectOf(task), next))) {
      return apiError(request, 400, ['assignee must be a project member (not a viewer)']);
    }
    if (next !== task.assigneeId) {
      const previous = task.assigneeId;
      task.assigneeId = next;
      task.updatedAt = nowIso();
      logActivity(
        task,
        user.id,
        next ? TaskActivityAction.ASSIGNED : TaskActivityAction.UNASSIGNED,
        'assigneeId',
        previous,
        next,
      );
      notify({
        recipients: [next],
        type: NotificationType.TASK_ASSIGNED,
        actorId: user.id,
        taskId: task.id,
      });
    }
    return HttpResponse.json(toTaskDto(task));
  }),

  http.get(apiPath('/tasks/:taskId/activity'), ({ request, params }) => {
    const user = currentUser(request);
    const task = requireViewableTask(request, user, params.taskId);
    const rows = db.activities
      .filter((a) => a.taskId === task.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(paginate(request, rows.map(toActivityDto)));
  }),
];
