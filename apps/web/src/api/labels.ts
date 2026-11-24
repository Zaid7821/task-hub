import type { CreateLabelInput, LabelDto, TaskDto, UpdateLabelInput } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { taskKeys, useInvalidateTaskViews } from './tasks';

export const labelKeys = {
  project: (projectId: string) => ['projects', projectId, 'labels'] as const,
};

export const labelsApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    api.get<LabelDto[]>(`/projects/${projectId}/labels`, undefined, signal),
  create: (projectId: string, input: CreateLabelInput) =>
    api.post<LabelDto>(`/projects/${projectId}/labels`, input),
  update: (labelId: string, input: UpdateLabelInput) =>
    api.patch<LabelDto>(`/labels/${labelId}`, input),
  remove: (labelId: string) => api.delete(`/labels/${labelId}`),
  setForTask: (taskId: string, labelIds: string[]) =>
    api.put<TaskDto>(`/tasks/${taskId}/labels`, { labelIds }),
};

export function useProjectLabels(projectId: string) {
  return useQuery({
    queryKey: labelKeys.project(projectId),
    queryFn: ({ signal }) => labelsApi.list(projectId, signal),
    staleTime: 60_000,
  });
}

/** Create/rename/recolour/delete project labels; tasks are refreshed since they embed labels. */
export function useLabelMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidateTasks = useInvalidateTaskViews();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: labelKeys.project(projectId) }),
      invalidateTasks(),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CreateLabelInput) => labelsApi.create(projectId, input),
      meta: { silentError: true },
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateLabelInput & { id: string }) =>
        labelsApi.update(id, input),
      meta: { silentError: true },
      onSuccess,
    }),
    remove: useMutation({ mutationFn: labelsApi.remove, onSuccess }),
  };
}

export function useSetTaskLabels() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskViews();
  return useMutation({
    mutationFn: ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) =>
      labelsApi.setForTask(taskId, labelIds),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.byKey(task.key), task);
      return invalidate();
    },
  });
}
