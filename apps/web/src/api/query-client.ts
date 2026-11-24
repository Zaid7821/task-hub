import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './client';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: Error;
    mutationMeta: {
      /** Skip the global error toast (the component shows its own error). */
      silentError?: boolean;
    };
  }
}

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silentError) return;
      toast.error(error.message);
    },
  }),
});
