import type { CreateProjectInput, Paginated, ProjectDto, ProjectListQuery } from '@aionos/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (query: ProjectListQuery) => [...projectKeys.lists(), query] as const,
  byKey: (key: string) => [...projectKeys.all, 'by-key', key] as const,
};

export const projectsApi = {
  list: (query: ProjectListQuery, signal?: AbortSignal) =>
    api.get<Paginated<ProjectDto>>('/projects', { ...query }, signal),
  getByKey: (key: string, signal?: AbortSignal) =>
    api.get<ProjectDto>(`/projects/by-key/${encodeURIComponent(key)}`, undefined, signal),
  create: (input: CreateProjectInput) => api.post<ProjectDto>('/projects', input),
};

export function useProjects(query: ProjectListQuery) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: ({ signal }) => projectsApi.list(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useProjectByKey(key: string) {
  return useQuery({
    queryKey: projectKeys.byKey(key),
    queryFn: ({ signal }) => projectsApi.getByKey(key, signal),
    enabled: key.length > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    // The create dialog shows errors inline (e.g. duplicate key) instead of a toast.
    meta: { silentError: true },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.byKey(project.key), project);
      return queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
