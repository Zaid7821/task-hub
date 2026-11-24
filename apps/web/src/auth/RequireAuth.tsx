import { Navigate, Outlet, useLocation } from 'react-router';
import { ApiError } from '@/api/client';
import { useMe } from '@/api/users';
import { ErrorState } from '@/components/common/ErrorState';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { Button } from '@/components/ui/button';
import { CurrentUserContext, useAuth } from './auth-context';

/** Gate for all signed-in routes: ensures credentials exist and the API profile (/users/me) loads. */
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  const me = useMe(auth.isAuthenticated);

  if (auth.isInitializing) return <FullPageSpinner label="Signing you in…" />;
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={auth.signedOut ? undefined : { from: location }} />;
  }
  if (me.isPending) return <FullPageSpinner label="Loading your profile…" />;

  if (me.isError) {
    const rejected = me.error instanceof ApiError && me.error.status === 401;
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorState
            title={rejected ? 'Your session was not accepted' : 'Could not load your profile'}
            error={me.error}
            onRetry={rejected ? undefined : () => void me.refetch()}
          />
          <Button variant="outline" className="w-full" onClick={() => void auth.logout()}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CurrentUserContext.Provider value={me.data}>
      <Outlet />
    </CurrentUserContext.Provider>
  );
}
