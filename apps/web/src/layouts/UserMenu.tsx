import { LogOutIcon, RotateCcwIcon } from 'lucide-react';
import { useAuth, useCurrentUser } from '@/auth/auth-context';
import { mocksEnabled } from '@/env';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { systemRoleLabel } from '@/lib/labels';

/** Dev + mock mode only: discard locally saved mock data and reload with fresh seed data. */
async function resetDemoData(): Promise<void> {
  const { resetMockDb } = await import('@/mocks/persistence');
  resetMockDb();
  window.location.reload();
}

export function UserMenu() {
  const user = useCurrentUser();
  const auth = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-2 py-1" aria-label="Open user menu">
          <UserAvatar user={user} size="sm" />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium">{user.displayName}</span>
            <span className="block text-xs text-muted-foreground">
              {systemRoleLabel[user.systemRole]}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary">{systemRoleLabel[user.systemRole]}</Badge>
            {user.department && <Badge variant="outline">{user.department.name}</Badge>}
            {auth.mode === 'dev' && <Badge variant="outline">Dev login</Badge>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {import.meta.env.DEV && mocksEnabled && (
          <DropdownMenuItem onSelect={() => void resetDemoData()}>
            <RotateCcwIcon /> Reset demo data
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void auth.logout()}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
