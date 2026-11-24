export const API_PREFIX = '/api/v1';

/** Local-dev auth bypass header (API: AUTH_DEV_BYPASS=true; web: VITE_AUTH_MODE=dev). */
export const DEV_USER_EMAIL_HEADER = 'X-Dev-User-Email';

export const PAGINATION_DEFAULT_PAGE_SIZE = 20;
export const PAGINATION_MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
