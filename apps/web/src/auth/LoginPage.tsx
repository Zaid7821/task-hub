import { lazy, Suspense } from 'react';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { devAuthEnabled } from '@/env';
import { EntraLoginPage } from './entra/EntraLoginPage';

const DevLoginPage =
  import.meta.env.DEV && devAuthEnabled
    ? lazy(() => import('./dev/DevLoginPage').then((m) => ({ default: m.DevLoginPage })))
    : null;

export function LoginPage() {
  if (!DevLoginPage) return <EntraLoginPage />;
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DevLoginPage />
    </Suspense>
  );
}
