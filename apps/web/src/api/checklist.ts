import type {
  ChecklistItemDto,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { taskKeys } from './tasks';

export const checklistApi = {
  list: (taskId: string, signal?: AbortSignal) =>
    api.get<ChecklistItemDto[]>(`/tasks/${taskId}/checklist`, undefined, signal),
  create: (taskId: string, input: CreateChecklistItemInput) =>
    api.post<ChecklistItemDto>(`/tasks/${taskId}/checklist`, input),
  update: (itemId: string, input: UpdateChecklistItemInput) =>
    api.patch<ChecklistItemDto>(`/checklist-items/${itemId}`, input),
  remove: (itemId: string) => api.delete(`/checklist-items/${itemId}`),
};

const checklistKey = (taskId: string) => [...taskKeys.all, taskId, 'checklist'] as const;

export function useChecklist(taskId: string) {
  return useQuery({
    queryKey: checklistKey(taskId),
    queryFn: ({ signal }) => checklistApi.list(taskId, signal),
  });
}

/**
 * Checklist edits. Toggling is optimistic (instant tick); every change refreshes the list and the
 * task's done/total counter shown on cards.
 */
export function useChecklistMutations(taskId: string) {
  const queryClient = useQueryClient();
  const key = checklistKey(taskId);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'board'] }),
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'by-key'] }),
    ]);

  return {
    create: useMutation({
      mutationFn: (title: string) => checklistApi.create(taskId, { title }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateChecklistItemInput & { id: string }) =>
        checklistApi.update(id, input),
      onMutate: async ({ id, ...input }) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<ChecklistItemDto[]>(key);
        queryClient.setQueryData<ChecklistItemDto[]>(key, (items) =>
          items?.map((item) => (item.id === id ? { ...item, ...input } : item)),
        );
        return { previous };
      },
      onError: (_error, _vars, context) => queryClient.setQueryData(key, context?.previous),
      onSettled: refresh,
    }),
    remove: useMutation({ mutationFn: checklistApi.remove, onSuccess: refresh }),
  };
}
