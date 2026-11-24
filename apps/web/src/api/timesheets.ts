import type {
  CreateTimeLogInput,
  TimesheetStatus,
  TimesheetSummaryDto,
  TimesheetWeekDto,
  TimeLogDto,
} from '@aionos/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { notificationKeys } from './notifications';
import { taskKeys } from './tasks';

export const timesheetKeys = {
  all: ['timesheets'] as const,
  mine: (weekStart: string) => [...timesheetKeys.all, 'me', weekStart] as const,
  approvals: (status: TimesheetStatus) => [...timesheetKeys.all, 'approvals', status] as const,
  detail: (id: string) => [...timesheetKeys.all, 'detail', id] as const,
};

export const timesheetsApi = {
  mine: (weekStart: string, signal?: AbortSignal) =>
    api.get<TimesheetWeekDto>('/timesheets/me', { weekStart }, signal),
  submit: (weekStart: string) => api.post<TimesheetWeekDto>('/timesheets/me/submit', { weekStart }),
  approvals: (status: TimesheetStatus, signal?: AbortSignal) =>
    api.get<TimesheetSummaryDto[]>('/timesheets/approvals', { status }, signal),
  get: (id: string, signal?: AbortSignal) =>
    api.get<TimesheetWeekDto>(`/timesheets/${id}`, undefined, signal),
  approve: (id: string, note?: string) =>
    api.post<TimesheetWeekDto>(`/timesheets/${id}/approve`, { note }),
  reject: (id: string, note: string) =>
    api.post<TimesheetWeekDto>(`/timesheets/${id}/reject`, { note }),
  logTime: (taskId: string, input: CreateTimeLogInput) =>
    api.post<TimeLogDto>(`/tasks/${taskId}/time-logs`, input),
  deleteLog: (logId: string) => api.delete(`/time-logs/${logId}`),
};

export function useMyTimesheet(weekStart: string) {
  return useQuery({
    queryKey: timesheetKeys.mine(weekStart),
    queryFn: ({ signal }) => timesheetsApi.mine(weekStart, signal),
    placeholderData: keepPreviousData,
  });
}

export function useApprovals(status: TimesheetStatus) {
  return useQuery({
    queryKey: timesheetKeys.approvals(status),
    queryFn: ({ signal }) => timesheetsApi.approvals(status, signal),
  });
}

export function useTimesheet(id: string | undefined) {
  return useQuery({
    queryKey: timesheetKeys.detail(id ?? ''),
    queryFn: ({ signal }) => timesheetsApi.get(id ?? '', signal),
    enabled: Boolean(id),
  });
}

/** Everything timesheet edits can affect: sheets, task hours, dashboards, notifications. */
function useInvalidateTimesheets() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    ]);
}

export function useTimesheetMutations() {
  const onSuccess = useInvalidateTimesheets();
  return {
    logTime: useMutation({
      mutationFn: ({ taskId, ...input }: CreateTimeLogInput & { taskId: string }) =>
        timesheetsApi.logTime(taskId, input),
      meta: { silentError: true },
      onSuccess,
    }),
    deleteLog: useMutation({ mutationFn: timesheetsApi.deleteLog, onSuccess }),
    submit: useMutation({ mutationFn: timesheetsApi.submit, onSuccess }),
    approve: useMutation({
      mutationFn: ({ id, note }: { id: string; note?: string }) => timesheetsApi.approve(id, note),
      onSuccess,
    }),
    reject: useMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => timesheetsApi.reject(id, note),
      meta: { silentError: true },
      onSuccess,
    }),
  };
}
