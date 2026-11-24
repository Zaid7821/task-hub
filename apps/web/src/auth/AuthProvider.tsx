import { lazy, Suspense, type ReactNode } from 'react';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { devAuthEnabled } from '@/env';

// `import.meta.env.DEV` is replaced with `false` in production builds, so this branch and the
// dev provider chunk are removed entirely.
const DevAuthProvider =
  import.meta.env.DEV && devAuthEnabled
    ? lazy(() => import('./dev/DevAuthProvider').then((m) => ({ default: m.DevAuthProvider })))
    : null;
const EntraAuthProvider = lazy(() =>
  import('./entra/EntraAuthProvider').then((m) => ({ default: m.EntraAuthProvider })),
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const Provider = DevAuthProvider ?? EntraAuthProvider;
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Provider>{children}</Provider>
    </Suspense>
  );
}
