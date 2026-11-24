import type { CreateSavedViewInput, SavedViewDto } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

const savedViewKeys = { all: ['saved-views'] as const };

export const savedViewsApi = {
  list: (signal?: AbortSignal) => api.get<SavedViewDto[]>('/saved-views', undefined, signal),
  create: (input: CreateSavedViewInput) => api.post<SavedViewDto>('/saved-views', input),
  remove: (id: string) => api.delete(`/saved-views/${id}`),
};

export function useSavedViews() {
  return useQuery({
    queryKey: savedViewKeys.all,
    queryFn: ({ signal }) => savedViewsApi.list(signal),
    staleTime: 5 * 60_000,
  });
}

export function useSavedViewMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: savedViewKeys.all });
  return {
    create: useMutation({
      mutationFn: savedViewsApi.create,
      meta: { silentError: true },
      onSuccess,
    }),
    remove: useMutation({ mutationFn: savedViewsApi.remove, onSuccess }),
  };
}
