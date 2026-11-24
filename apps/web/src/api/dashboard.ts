import type { MyStatsDto } from '@aionos/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  me: () => [...dashboardKeys.all, 'me'] as const,
};

export const dashboardApi = {
  me: (signal?: AbortSignal) => api.get<MyStatsDto>('/dashboard/me', undefined, signal),
};

export function useMyStats() {
  return useQuery({
    queryKey: dashboardKeys.me(),
    queryFn: ({ signal }) => dashboardApi.me(signal),
    staleTime: 5 * 60_000,
  });
}
