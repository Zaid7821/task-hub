/** ISO-8601 timestamp, e.g. "2026-11-20T09:58:27.571Z". */
export type IsoDateTime = string;
/** Calendar date without time, "YYYY-MM-DD". */
export type IsoDate = string;

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export type SortDirection = 'asc' | 'desc';

/** Minimal user reference embedded in other resources. */
export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
}

export interface NamedRef {
  id: string;
  name: string;
}
