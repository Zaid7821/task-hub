import { Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../auth-context';
import { AuthShell } from '../AuthShell';
import { usePostLoginRedirect } from '../use-post-login-redirect';

export function EntraLoginPage() {
  const auth = useAuth();
  const redirectTo = usePostLoginRedirect();

  if (auth.isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <AuthShell>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your AIonOS Microsoft account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            disabled={auth.isInitializing}
            onClick={() => void auth.login()}
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
