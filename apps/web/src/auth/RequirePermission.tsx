import { Navigate, Outlet } from 'react-router';
import type { Viewer } from '@/lib/permissions';
import { useCurrentUser } from './auth-context';

/** Route guard: renders child routes only if `check` passes, otherwise redirects to /no-access. */
export function RequirePermission({ check }: { check: (viewer: Viewer) => boolean }) {
  const user = useCurrentUser();
  return check(user) ? <Outlet /> : <Navigate to="/no-access" replace />;
}
