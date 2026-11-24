import {
  DEV_USER_EMAIL_HEADER,
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  type ErrorResponse,
  type Paginated,
} from '@aionos/shared';
import { HttpResponse } from 'msw';
import { env } from '@/env';
import { db, type ProjectRow, type UserRow } from './db';

/** Absolute URL pattern for a mocked endpoint, e.g. apiPath('/users/:id'). */
export const apiPath = (path: string): string => `${env.VITE_API_BASE_URL}${path}`;

const REASONS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

/** Builds a response in the API's standard error shape. Throw it from a resolver to short-circuit. */
export function apiError(
  request: Request,
  statusCode: number,
  message: string | string[],
): HttpResponse<ErrorResponse> {
  const body: ErrorResponse = {
    statusCode,
    message,
    error: REASONS[statusCode] ?? 'Error',
    timestamp: new Date().toISOString(),
    path: new URL(request.url).pathname,
  };
  return HttpResponse.json(body, { status: statusCode });
}

/** Resolves the caller from the dev-auth header, like the API's dev bypass. Throws 401 otherwise. */
export function currentUser(request: Request): UserRow {
  const email = request.headers.get(DEV_USER_EMAIL_HEADER)?.toLowerCase();
  // TODO(phase-3): mock mode only understands dev auth; Entra bearer tokens are not decoded here.
  const user = email ? db.users.find((u) => u.email === email) : undefined;
  if (!user) throw apiError(request, 401, 'Not authenticated');
  if (!user.isActive) throw apiError(request, 401, 'User account is inactive');
  return user;
}

function positiveInt(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Applies ?page&pageSize exactly like the API (pageSize max 100); throws 400 on invalid values. */
export function paginate<T>(request: Request, items: T[]): Paginated<T> {
  const params = new URL(request.url).searchParams;
  const page = positiveInt(params.get('page'), 1);
  const pageSize = positiveInt(params.get('pageSize'), PAGINATION_DEFAULT_PAGE_SIZE);
  if (page === null || pageSize === null || pageSize > PAGINATION_MAX_PAGE_SIZE) {
    throw apiError(request, 400, [
      'page must be a positive integer',
      `pageSize must be an integer between 1 and ${PAGINATION_MAX_PAGE_SIZE}`,
    ]);
  }
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    },
  };
}

/** Loads a project the caller can view, or throws 404/403 like the API's ProjectAccessGuard. */
export function requireViewableProject(
  request: Request,
  user: UserRow,
  projectId: unknown,
  canView: (user: UserRow, project: ProjectRow) => boolean,
): ProjectRow {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw apiError(request, 404, 'Project not found');
  if (!canView(user, project))
    throw apiError(request, 403, 'You do not have access to this project');
  return project;
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    throw apiError(request, 400, 'Request body must be valid JSON');
  }
}

export function searchParam(request: Request, name: string): string | undefined {
  const value = new URL(request.url).searchParams.get(name);
  return value === null || value === '' ? undefined : value;
}

export function matchesSearch(search: string | undefined, ...fields: (string | null)[]): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}
