import type { Paginated, UserDto, UserListQuery } from '@aionos/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  list: (query: UserListQuery) => [...userKeys.all, 'list', query] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const usersApi = {
  me: (signal?: AbortSignal) => api.get<UserDto>('/users/me', undefined, signal),
  list: (query: UserListQuery, signal?: AbortSignal) =>
    api.get<Paginated<UserDto>>('/users', { ...query }, signal),
  get: (id: string, signal?: AbortSignal) => api.get<UserDto>(`/users/${id}`, undefined, signal),
};

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: ({ signal }) => usersApi.me(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useUsers(query: UserListQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: ({ signal }) => usersApi.list(query, signal),
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: ({ signal }) => usersApi.get(id ?? '', signal),
    enabled: Boolean(id),
  });
}
