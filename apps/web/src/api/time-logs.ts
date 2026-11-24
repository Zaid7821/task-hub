import type { CreateTimeLogInput, Paginated, TimeLogDto } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { taskKeys } from './tasks';

export const timeLogsApi = {
  list: (taskId: string, signal?: AbortSignal) =>
    api.get<Paginated<TimeLogDto>>(`/tasks/${taskId}/time-logs`, { pageSize: 100 }, signal),
  create: (taskId: string, input: CreateTimeLogInput) =>
    api.post<TimeLogDto>(`/tasks/${taskId}/time-logs`, input),
};

// TODO(phase-x): "load more" for tasks with more than 100 time logs.
export function useTaskTimeLogs(taskId: string) {
  return useQuery({
    queryKey: taskKeys.timeLogs(taskId),
    queryFn: ({ signal }) => timeLogsApi.list(taskId, signal),
    select: (page) => page.data,
  });
}

export function useLogTime(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeLogInput) => timeLogsApi.create(taskId, input),
    meta: { silentError: true },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.timeLogs(taskId) }),
        // Logged hours appear on the task itself and in dashboards.
        queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'by-key'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  });
}
