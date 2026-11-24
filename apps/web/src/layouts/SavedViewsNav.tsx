import { BookmarkIcon, XIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useSavedViewMutations, useSavedViews } from '@/api/saved-views';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

/** The signed-in user's saved views; hidden until they save one. */
export function SavedViewsNav() {
  const views = useSavedViews();
  const { remove } = useSavedViewMutations();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  if (!views.data || views.data.length === 0) return null;
  const current = `${location.pathname}${location.search}`;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Saved views</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {views.data.map((view) => {
            const to = `${view.path}?${view.query}`;
            return (
              <SidebarMenuItem key={view.id}>
                <SidebarMenuButton asChild tooltip={view.name} isActive={current === to}>
                  <NavLink to={to} onClick={() => isMobile && setOpenMobile(false)}>
                    <BookmarkIcon />
                    <span>{view.name}</span>
                  </NavLink>
                </SidebarMenuButton>
                <SidebarMenuAction
                  showOnHover
                  aria-label={`Delete saved view ${view.name}`}
                  onClick={() =>
                    remove.mutate(view.id, {
                      onSuccess: () => toast.success(`Deleted "${view.name}"`),
                    })
                  }
                >
                  <XIcon />
                </SidebarMenuAction>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
