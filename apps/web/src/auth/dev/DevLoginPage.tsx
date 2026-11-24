// Dev-only. Loaded behind `devAuthEnabled`, so it is excluded from production bundles.
import { SystemRole } from '@aionos/shared';
import { FlaskConicalIcon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mocksEnabled } from '@/env';
import { systemRoleLabel } from '@/lib/labels';
import { DEPARTMENTS, USERS, seedEmail } from '@/mocks/data/seed-data';
import { useAuth } from '../auth-context';
import { AuthShell } from '../AuthShell';
import { usePostLoginRedirect } from '../use-post-login-redirect';

const ROLE_ORDER: SystemRole[] = [
  SystemRole.SUPER_ADMIN,
  SystemRole.DEPARTMENT_HEAD,
  SystemRole.MANAGER,
  SystemRole.EMPLOYEE,
  SystemRole.VIEWER,
];

const departmentName = (key: string) => DEPARTMENTS.find((d) => d.key === key)?.name ?? key;

export function DevLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const redirectTo = usePostLoginRedirect();

  if (auth.isAuthenticated) return <Navigate to={redirectTo} replace />;

  const loginAs = async (email: string) => {
    await auth.login(email);
    void navigate(redirectTo, { replace: true });
  };

  return (
    <AuthShell wide>
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p>
          <strong>Development login.</strong> Pick a seed user to test role-based UI. Requests are
          sent with the dev email header{' '}
          {mocksEnabled ? 'to the mock API' : 'to the real API (needs AUTH_DEV_BYPASS=true)'}. This
          page does not exist in production builds.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_ORDER.map((role) => {
          const users = USERS.filter((u) => u.role === role);
          return (
            <Card
              key={role}
              className={role === SystemRole.SUPER_ADMIN ? 'md:col-span-2' : undefined}
            >
              <CardHeader>
                <CardTitle className="text-sm">
                  {systemRoleLabel[role]}{' '}
                  <span className="text-muted-foreground">({users.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                {users.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => void loginAs(seedEmail(u.key))}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <UserAvatar user={{ displayName: u.name }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {u.title} · {departmentName(u.dept)}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {seedEmail(u.key)}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AuthShell>
  );
}
