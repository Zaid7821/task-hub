import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

export interface RouteTab {
  label: string;
  to: string;
}

/** Tab strip where each tab is a route, so tabs are linkable and survive reloads. */
export function RouteTabs({
  tabs,
  activeTo,
  className,
}: {
  tabs: RouteTab[];
  /** Force a tab to look active (e.g. the tab shown behind a drawer route). */
  activeTo?: string;
  className?: string;
}) {
  return (
    <nav className={cn('flex gap-1 overflow-x-auto border-b', className)} aria-label="Sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive: routeActive }) => {
            const isActive = routeActive || tab.to === activeTo;
            return cn(
              'border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            );
          }}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
