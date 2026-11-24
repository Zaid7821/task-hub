import type {
  DepartmentDto,
  DepartmentListQuery,
  Paginated,
  TeamDto,
  TeamListQuery,
} from '@aionos/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export const orgKeys = {
  departments: (query: DepartmentListQuery) => ['departments', 'list', query] as const,
  teams: (query: TeamListQuery) => ['teams', 'list', query] as const,
};

export const orgApi = {
  departments: (query: DepartmentListQuery, signal?: AbortSignal) =>
    api.get<Paginated<DepartmentDto>>('/departments', { ...query }, signal),
  teams: (query: TeamListQuery, signal?: AbortSignal) =>
    api.get<Paginated<TeamDto>>('/teams', { ...query }, signal),
};

export function useDepartments(query: DepartmentListQuery = {}) {
  return useQuery({
    queryKey: orgKeys.departments(query),
    queryFn: ({ signal }) => orgApi.departments(query, signal),
    staleTime: 5 * 60_000,
  });
}

export function useTeams(query: TeamListQuery = {}) {
  return useQuery({
    queryKey: orgKeys.teams(query),
    queryFn: ({ signal }) => orgApi.teams(query, signal),
    staleTime: 5 * 60_000,
  });
}
