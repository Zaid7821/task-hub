import type { ErrorResponse } from '@aionos/shared';
import { env } from '@/env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorResponse | null,
  ) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    super(message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

interface ApiAuthConfig {
  /** Returns headers that authenticate the request (Bearer token or dev header). */
  getHeaders: () => Promise<Record<string, string>>;
  /** Called when the API answers 401. */
  onUnauthorized: () => void;
}

let auth: ApiAuthConfig = {
  getHeaders: () => Promise.resolve({}),
  onUnauthorized: () => undefined,
};

/** Wired once by the active auth provider (dev or Entra). */
export function configureApiAuth(config: ApiAuthConfig): void {
  auth = config;
}

export function toQueryString(params: QueryParams | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await auth.getHeaders()),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${env.VITE_API_BASE_URL}${path}${toQueryString(options.query)}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) auth.onUnauthorized();
    const body = response.headers.get('content-type')?.includes('application/json')
      ? ((await response.json()) as ErrorResponse)
      : null;
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
