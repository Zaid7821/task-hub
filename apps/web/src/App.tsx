import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { queryClient } from '@/api/query-client';
import { AuthProvider } from '@/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme';
import { router } from '@/routes/router';

const QueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
          <Toaster richColors closeButton />
        </TooltipProvider>
        {QueryDevtools && (
          <Suspense>
            <QueryDevtools buttonPosition="bottom-left" />
          </Suspense>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
