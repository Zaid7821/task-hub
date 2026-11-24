import type { UserSummary } from '@aionos/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-7 text-xs',
  md: 'size-8 text-sm',
  lg: 'size-10',
};

interface UserAvatarProps {
  user: Pick<UserSummary, 'displayName'> | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Decorative: hidden from screen readers, so always show or label the person's name nearby. */
export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  // TODO(phase-x): show the Microsoft Graph profile photo when available.
  return (
    <Avatar
      aria-hidden
      className={cn(SIZES[size], className)}
      title={user?.displayName ?? 'Unassigned'}
    >
      <AvatarFallback className={cn(user ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
        {user ? initials(user.displayName) : '–'}
      </AvatarFallback>
    </Avatar>
  );
}
