import {
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  SystemRole,
  type CreateProjectInput,
  type ProjectDto,
  type ProjectSortField,
} from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { canViewProject, isMember } from '../access';
import { db, newId, nowIso, type ProjectRow } from '../db';
import { apiError, apiPath, currentUser, matchesSearch, paginate, searchParam } from '../http';
import { toProjectDto } from '../serializers';

const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CREATOR_ROLES: SystemRole[] = [
  SystemRole.SUPER_ADMIN,
  SystemRole.DEPARTMENT_HEAD,
  SystemRole.MANAGER,
];

const SORTERS: Record<ProjectSortField, (a: ProjectDto, b: ProjectDto) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  key: (a, b) => a.key.localeCompare(b.key),
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  progress: (a, b) => a.progress - b.progress,
};

function isEnumValue<T extends string>(values: Record<string, T>, value: unknown): value is T {
  return typeof value === 'string' && (Object.values(values) as string[]).includes(value);
}

function validateCreate(body: Partial<CreateProjectInput>): string[] {
  const errors: string[] = [];
  if (typeof body.key !== 'string' || !PROJECT_KEY_PATTERN.test(body.key)) {
    errors.push('key must be 2-10 uppercase letters/digits, starting with a letter');
  }
  if (typeof body.name !== 'string' || body.name.trim().length < 3 || body.name.length > 200) {
    errors.push('name must be between 3 and 200 characters');
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string');
  }
  if (typeof body.departmentId !== 'string') errors.push('departmentId is required');
  if (!isEnumValue(ProjectVisibility, body.visibility)) {
    errors.push(`visibility must be one of ${Object.values(ProjectVisibility).join(', ')}`);
  }
  for (const field of ['startDate', 'endDate'] as const) {
    const value = body[field];
    if (value !== undefined && (typeof value !== 'string' || !ISO_DATE.test(value))) {
      errors.push(`${field} must be a date (YYYY-MM-DD)`);
    }
  }
  if (body.startDate && body.endDate && body.endDate < body.startDate) {
    errors.push('endDate must not be before startDate');
  }
  return errors;
}

export const projectHandlers = [
  http.get(apiPath('/projects'), ({ request }) => {
    const user = currentUser(request);
    const search = searchParam(request, 'search');
    const status = searchParam(request, 'status');
    const visibility = searchParam(request, 'visibility');
    const departmentId = searchParam(request, 'departmentId');
    const mine = searchParam(request, 'mine') === 'true';
    const includeArchived = searchParam(request, 'includeArchived') === 'true';
    const sortParam = searchParam(request, 'sort');
    const sort: ProjectSortField =
      sortParam && sortParam in SORTERS ? (sortParam as ProjectSortField) : 'name';
    const direction = searchParam(request, 'order') === 'desc' ? -1 : 1;

    const rows = db.projects
      .filter((p) => canViewProject(user, p))
      .filter((p) => matchesSearch(search, p.name, p.key))
      .filter((p) =>
        status ? p.status === status : includeArchived || p.status !== ProjectStatus.ARCHIVED,
      )
      .filter((p) => !visibility || p.visibility === visibility)
      .filter((p) => !departmentId || p.departmentId === departmentId)
      .filter((p) => !mine || isMember(p.id, user.id));

    const dtos = rows
      .map((p) => toProjectDto(p, user.id))
      .sort((a, b) => direction * SORTERS[sort](a, b) || a.name.localeCompare(b.name));

    return HttpResponse.json(paginate(request, dtos));
  }),

  // Registered before any /projects/:projectId/* routes.
  http.get(apiPath('/projects/by-key/:key'), ({ request, params }) => {
    const user = currentUser(request);
    const key = typeof params.key === 'string' ? params.key.toUpperCase() : '';
    const project = db.projects.find((p) => p.key === key);
    if (!project) return apiError(request, 404, `Project ${key} not found`);
    if (!canViewProject(user, project)) {
      return apiError(request, 403, 'You do not have access to this project');
    }
    return HttpResponse.json(toProjectDto(project, user.id));
  }),

  http.post(apiPath('/projects'), async ({ request }) => {
    const user = currentUser(request);
    if (!CREATOR_ROLES.includes(user.systemRole)) {
      return apiError(request, 403, 'Only managers and above can create projects');
    }
    const body = (await request.json()) as Partial<CreateProjectInput>;
    const errors = validateCreate(body);
    if (errors.length > 0) return apiError(request, 400, errors);

    const input = body as CreateProjectInput;
    if (!db.departments.some((d) => d.id === input.departmentId)) {
      return apiError(request, 400, ['departmentId does not exist']);
    }
    if (db.projects.some((p) => p.key === input.key)) {
      return apiError(request, 409, `Project key ${input.key} is already in use`);
    }

    const now = nowIso();
    const project: ProjectRow = {
      id: newId(),
      key: input.key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ownerId: user.id,
      departmentId: input.departmentId,
      status: ProjectStatus.ACTIVE,
      visibility: input.visibility,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      taskCounter: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.projects.push(project);
    db.members.push({
      projectId: project.id,
      userId: user.id,
      role: ProjectMemberRole.OWNER,
      createdAt: now,
    });
    // TODO(phase-x): the real API also writes an AuditLog entry for project creation.

    return HttpResponse.json(toProjectDto(project, user.id), { status: 201 });
  }),
];
