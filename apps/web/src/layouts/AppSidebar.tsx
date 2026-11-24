import { NavLink, useLocation } from 'react-router';
import { useCurrentUser } from '@/auth/auth-context';
import { BrandLogo } from '@/components/common/BrandLogo';
import { BrandMark } from '@/components/common/BrandMark';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from './nav-items';
import { SavedViewsNav } from './SavedViewsNav';

export function AppSidebar() {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = NAV_ITEMS.filter((item) => item.visible?.(user) ?? true);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="AIonOS Work Tracker">
              <NavLink to="/" aria-label="AIonOS Work Tracker home">
                {/* Collapsed (icon) sidebar: square mark. Expanded: full wordmark. */}
                <BrandMark className="hidden group-data-[collapsible=icon]:flex" />
                <span className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
                  <BrandLogo className="h-6 shrink-0" />
                  <span className="truncate border-l pl-2 text-sm font-medium text-muted-foreground">
                    Work Tracker
                  </span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                  >
                    <NavLink to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SavedViewsNav />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
