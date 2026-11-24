import {
  ProjectStatus,
  ProjectVisibility,
  type ProjectListQuery,
  type ProjectSortField,
  type SortDirection,
} from '@aionos/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export const PROJECTS_PAGE_SIZE = 20;

export const PROJECT_SORT_OPTIONS = {
  name: { label: 'Name (A–Z)', sort: 'name', order: 'asc' },
  newest: { label: 'Newest first', sort: 'createdAt', order: 'desc' },
  progressDesc: { label: 'Most progress', sort: 'progress', order: 'desc' },
  progressAsc: { label: 'Least progress', sort: 'progress', order: 'asc' },
  key: { label: 'Key', sort: 'key', order: 'asc' },
} as const satisfies Record<
  string,
  { label: string; sort: ProjectSortField; order: SortDirection }
>;

export type ProjectSortOption = keyof typeof PROJECT_SORT_OPTIONS;

function parseEnum<T extends string>(values: Record<string, T>, raw: string | null): T | undefined {
  return raw !== null && (Object.values(values) as string[]).includes(raw) ? (raw as T) : undefined;
}

function isSortOption(raw: string | null): raw is ProjectSortOption {
  return raw !== null && raw in PROJECT_SORT_OPTIONS;
}

export interface ProjectListFilters {
  search: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  mine: boolean;
  sort: ProjectSortOption;
  page: number;
}

/** Projects list state lives in the URL (?q, status, visibility, mine, sort, page) so views are shareable. */
export function useProjectListParams() {
  const [params, setParams] = useSearchParams();

  const rawSort = params.get('sort');
  const rawPage = Number(params.get('page'));
  const filters: ProjectListFilters = {
    search: params.get('q') ?? '',
    status: parseEnum(ProjectStatus, params.get('status')),
    visibility: parseEnum(ProjectVisibility, params.get('visibility')),
    mine: params.get('mine') === '1',
    sort: isSortOption(rawSort) ? rawSort : 'name',
    page: Number.isInteger(rawPage) && rawPage > 1 ? rawPage : 1,
  };

  /** Applies changes; any change other than `page` resets to page 1. Null/empty removes the param. */
  const update = useCallback(
    (
      changes: Partial<
        Record<'q' | 'status' | 'visibility' | 'mine' | 'sort' | 'page', string | null>
      >,
    ) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const sortOption = PROJECT_SORT_OPTIONS[filters.sort];
  const query: ProjectListQuery = {
    search: filters.search || undefined,
    status: filters.status,
    visibility: filters.visibility,
    mine: filters.mine || undefined,
    sort: sortOption.sort,
    order: sortOption.order,
    page: filters.page,
    pageSize: PROJECTS_PAGE_SIZE,
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.visibility || filters.mine,
  );

  return { filters, query, update, hasActiveFilters };
}
