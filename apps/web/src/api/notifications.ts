import type { NotificationDto, Paginated, UnreadCountDto } from '@aionos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  recent: () => [...notificationKeys.all, 'recent'] as const,
};

export const notificationsApi = {
  unreadCount: (signal?: AbortSignal) =>
    api.get<UnreadCountDto>('/notifications/unread-count', undefined, signal),
  recent: (signal?: AbortSignal) =>
    api.get<Paginated<NotificationDto>>('/notifications', { pageSize: 30 }, signal),
  markRead: (id: string) => api.patch<NotificationDto>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};

/** Polls the unread badge. TODO(phase-x): push via SSE/WebSocket instead of polling. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    select: (d) => d.count,
  });
}

// TODO(phase-x): full notifications page with paging; the bell shows the latest 30.
export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.recent(),
    queryFn: ({ signal }) => notificationsApi.recent(signal),
    enabled,
    select: (page) => page.data,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  return {
    markRead: useMutation({ mutationFn: notificationsApi.markRead, onSuccess }),
    markAllRead: useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess }),
  };
}
