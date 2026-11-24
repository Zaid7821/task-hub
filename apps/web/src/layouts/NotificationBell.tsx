import type { NotificationDto } from '@aionos/shared';
import { BellIcon, CheckCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  useNotificationMutations,
  useRecentNotifications,
  useUnreadCount,
} from '@/api/notifications';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, timeAgo } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { describeNotification, notificationTarget } from './notification-text';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const count = unread.data ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        >
          <BellIcon />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
              aria-hidden
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] p-0">
        {open && <NotificationPanel onNavigate={() => setOpen(false)} hasUnread={count > 0} />}
      </PopoverContent>
    </Popover>
  );
}

function NotificationPanel({
  onNavigate,
  hasUnread,
}: {
  onNavigate: () => void;
  hasUnread: boolean;
}) {
  const notifications = useRecentNotifications(true);
  const { markRead, markAllRead } = useNotificationMutations();
  const navigate = useNavigate();
  const location = useLocation();

  const openNotification = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id);
    const target = notificationTarget(n, `${location.pathname}${location.search}`);
    if (target) {
      onNavigate();
      void navigate(target.to, { state: target.state });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-semibold">Notifications</p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasUnread || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheckIcon /> Mark all read
        </Button>
      </div>
      <div className="max-h-[26rem] overflow-y-auto">
        {notifications.isPending ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : notifications.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load notifications.</p>
        ) : notifications.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <BellIcon className="size-6" aria-hidden />
            You're all caught up.
          </div>
        ) : (
          <ul aria-label="Notifications">
            {notifications.data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn(
                    'flex w-full gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent',
                    !n.readAt && 'bg-primary/5',
                  )}
                >
                  <UserAvatar user={n.actor} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      <span className="font-medium">{n.actor?.displayName ?? 'Someone'}</span>{' '}
                      {describeNotification(n)}
                    </span>
                    {n.task && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {n.task.title}
                      </span>
                    )}
                    {n.data?.excerpt && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        “{n.data.excerpt}”
                      </span>
                    )}
                    {n.data?.note && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        Reason: {n.data.note}
                      </span>
                    )}
                    <time
                      className="mt-0.5 block text-xs text-muted-foreground"
                      dateTime={n.createdAt}
                      title={formatDateTime(n.createdAt)}
                    >
                      {timeAgo(n.createdAt)}
                    </time>
                  </span>
                  {!n.readAt && (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
