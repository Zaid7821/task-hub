import type { CommentDto, CommentInput, Paginated } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { taskKeys } from './tasks';

export const commentsApi = {
  list: (taskId: string, signal?: AbortSignal) =>
    api.get<Paginated<CommentDto>>(`/tasks/${taskId}/comments`, { pageSize: 100 }, signal),
  create: (taskId: string, input: CommentInput) =>
    api.post<CommentDto>(`/tasks/${taskId}/comments`, input),
  update: (commentId: string, input: CommentInput) =>
    api.patch<CommentDto>(`/comments/${commentId}`, input),
  remove: (commentId: string) => api.delete(`/comments/${commentId}`),
};

// TODO(phase-x): "load more" for tasks with more than 100 comments.
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: ({ signal }) => commentsApi.list(taskId, signal),
    select: (page) => page.data,
  });
}

/** Create/edit/delete comments; refreshes the thread and comment counts on cards. */
export function useCommentMutations(taskId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) }),
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'board'] }),
      queryClient.invalidateQueries({ queryKey: [...taskKeys.all, 'by-key'] }),
    ]);

  return {
    create: useMutation({
      mutationFn: (body: string) => commentsApi.create(taskId, { body }),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: string }) => commentsApi.update(id, { body }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => commentsApi.remove(id),
      onSuccess,
    }),
  };
}
