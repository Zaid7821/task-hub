import type { DirectorySyncRunDto, DirectorySyncStatusDto } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { userKeys } from './users';

export const directorySyncKeys = { status: ['directory-sync', 'status'] as const };

export const directorySyncApi = {
  status: (signal?: AbortSignal) =>
    api.get<DirectorySyncStatusDto>('/admin/directory-sync', undefined, signal),
  run: () => api.post<DirectorySyncRunDto>('/admin/directory-sync'),
};

export function useDirectorySyncStatus() {
  return useQuery({
    queryKey: directorySyncKeys.status,
    queryFn: ({ signal }) => directorySyncApi.status(signal),
    // A scheduled run may finish while the page is open.
    refetchInterval: 60_000,
  });
}

export function useRunDirectorySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: directorySyncApi.run,
    meta: { silentError: true },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: directorySyncKeys.status }),
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['departments'] }),
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
      ]),
  });
}
