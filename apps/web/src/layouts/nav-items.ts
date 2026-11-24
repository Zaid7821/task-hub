import {
  BriefcaseIcon,
  ClockIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  type LucideIcon,
} from 'lucide-react';
import { canAccessAdmin, canLogTime, type Viewer } from '@/lib/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  visible?: (viewer: Viewer) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'My Work', to: '/my-work', icon: BriefcaseIcon },
  { label: 'Projects', to: '/projects', icon: FolderKanbanIcon },
  { label: 'Timesheet', to: '/timesheet', icon: ClockIcon, visible: canLogTime },
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
  { label: 'Admin', to: '/admin', icon: ShieldIcon, visible: canAccessAdmin },
];
