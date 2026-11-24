import type { AddProjectMemberInput, Paginated, ProjectMemberDto } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { projectKeys } from './projects';

export const memberKeys = {
  list: (projectId: string) => ['projects', projectId, 'members'] as const,
};

export const membersApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    api.get<Paginated<ProjectMemberDto>>(
      `/projects/${projectId}/members`,
      { pageSize: 100 },
      signal,
    ),
  add: (projectId: string, input: AddProjectMemberInput) =>
    api.post<ProjectMemberDto>(`/projects/${projectId}/members`, input),
  remove: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

// TODO(phase-x): paginate the members tab if projects grow beyond 100 members.
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: memberKeys.list(projectId),
    queryFn: ({ signal }) => membersApi.list(projectId, signal),
    select: (page) => page.data,
  });
}

function useInvalidateMembers(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
}

export function useAddProjectMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId);
  return useMutation({
    mutationFn: (input: AddProjectMemberInput) => membersApi.add(projectId, input),
    meta: { silentError: true },
    onSuccess: invalidate,
  });
}

export function useRemoveProjectMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId);
  return useMutation({
    mutationFn: (userId: string) => membersApi.remove(projectId, userId),
    onSuccess: invalidate,
  });
}
