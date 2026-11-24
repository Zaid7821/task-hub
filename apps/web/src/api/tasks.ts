import type {
  BoardDto,
  ChangeTaskStatusInput,
  CreateTaskInput,
  Paginated,
  ReassignTaskInput,
  TaskActivityDto,
  TaskDto,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from '@aionos/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { api } from './client';
import { projectKeys } from './projects';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (query: TaskListQuery) => [...taskKeys.lists(), query] as const,
  board: (projectId: string) => [...taskKeys.all, 'board', projectId] as const,
  byKey: (key: string) => [...taskKeys.all, 'by-key', key] as const,
  activity: (taskId: string) => [...taskKeys.all, taskId, 'activity'] as const,
  comments: (taskId: string) => [...taskKeys.all, taskId, 'comments'] as const,
  timeLogs: (taskId: string) => [...taskKeys.all, taskId, 'time-logs'] as const,
};

export const tasksApi = {
  list: (query: TaskListQuery, signal?: AbortSignal) =>
    api.get<Paginated<TaskDto>>('/tasks', { ...query }, signal),
  board: (projectId: string, signal?: AbortSignal) =>
    api.get<BoardDto>(`/projects/${projectId}/board`, undefined, signal),
  getByKey: (key: string, signal?: AbortSignal) =>
    api.get<TaskDto>(`/tasks/by-key/${encodeURIComponent(key)}`, undefined, signal),
  create: (projectId: string, input: CreateTaskInput) =>
    api.post<TaskDto>(`/projects/${projectId}/tasks`, input),
  update: (taskId: string, input: UpdateTaskInput) => api.patch<TaskDto>(`/tasks/${taskId}`, input),
  changeStatus: (taskId: string, input: ChangeTaskStatusInput) =>
    api.patch<TaskDto>(`/tasks/${taskId}/status`, input),
  reassign: (taskId: string, input: ReassignTaskInput) =>
    api.patch<TaskDto>(`/tasks/${taskId}/assignee`, input),
  activity: (taskId: string, signal?: AbortSignal) =>
    api.get<Paginated<TaskActivityDto>>(`/tasks/${taskId}/activity`, { pageSize: 100 }, signal),
};

export function useTaskByKey(key: string) {
  return useQuery({
    queryKey: taskKeys.byKey(key),
    queryFn: ({ signal }) => tasksApi.getByKey(key, signal),
    enabled: key.length > 0,
  });
}

// TODO(phase-x): "load more" when a task has more than 100 activity entries.
export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.activity(taskId ?? ''),
    queryFn: ({ signal }) => tasksApi.activity(taskId ?? '', signal),
    enabled: Boolean(taskId),
    select: (page) => page.data,
  });
}

/**
 * Field edits from the task drawer. The returned task replaces the cached one immediately;
 * boards, lists and project progress are refreshed in the background.
 */
export function useTaskFieldMutations(task: TaskDto) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskViews();
  const onSuccess = (updated: TaskDto) => {
    queryClient.setQueryData(taskKeys.byKey(updated.key), updated);
    return invalidate();
  };

  const update = useMutation({
    mutationFn: (input: UpdateTaskInput) => tasksApi.update(task.id, input),
    onSuccess,
  });
  const changeStatus = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.changeStatus(task.id, { status }),
    onSuccess,
  });
  const reassign = useMutation({
    mutationFn: (assigneeId: string | null) => tasksApi.reassign(task.id, { assigneeId }),
    onSuccess,
  });

  return {
    update,
    changeStatus,
    reassign,
    isSaving: update.isPending || changeStatus.isPending || reassign.isPending,
  };
}

export function useTasks(query: TaskListQuery, enabled = true) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: ({ signal }) => tasksApi.list(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProjectBoard(projectId: string) {
  return useQuery({
    queryKey: taskKeys.board(projectId),
    queryFn: ({ signal }) => tasksApi.board(projectId, signal),
  });
}

/** Refresh everything a task change can affect: boards, task lists, project progress. */
export function useInvalidateTaskViews() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      ]),
    [queryClient],
  );
}

export function useCreateTask(projectId: string) {
  const invalidate = useInvalidateTaskViews();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(projectId, input),
    meta: { silentError: true },
    onSuccess: () => invalidate(),
  });
}

export interface MoveTaskVariables {
  taskId: string;
  status: TaskStatus;
  position: number;
  /** Board as it should look after the move (applied optimistically). */
  nextBoard: BoardDto;
}

/**
 * Drag-and-drop move with an optimistic update: the board cache is updated synchronously
 * (no flicker when the drag overlay drops) and rolled back if the API rejects the move.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskViews();
  const boardKey = taskKeys.board(projectId);
  const mutationKey = ['moveTask', projectId];

  const mutation = useMutation({
    mutationKey,
    mutationFn: (vars: MoveTaskVariables & { previous: BoardDto | undefined }) =>
      tasksApi.changeStatus(vars.taskId, { status: vars.status, position: vars.position }),
    meta: { silentError: true },
    onError: (error, vars) => {
      queryClient.setQueryData(boardKey, vars.previous);
      toast.error('Could not move the task. Your change was reverted.', {
        description: error.message,
      });
    },
    onSettled: () => {
      // Only refetch once the last of several quick moves settles, so refetches don't undo pending moves.
      if (queryClient.isMutating({ mutationKey }) === 1) return invalidate();
      return undefined;
    },
  });

  const { mutate } = mutation;
  return useCallback(
    (move: MoveTaskVariables) => {
      const key = taskKeys.board(projectId);
      void queryClient.cancelQueries({ queryKey: key }, { revert: false });
      const previous = queryClient.getQueryData<BoardDto>(key);
      queryClient.setQueryData(key, move.nextBoard);
      mutate({ ...move, previous });
    },
    [queryClient, mutate, projectId],
  );
}
