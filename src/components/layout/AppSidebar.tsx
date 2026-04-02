import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePrefetchDashboard } from '@/hooks/useDashboardData';
import { useIsDesktop } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  BarChart4,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Shield,
  Shirt,
  Users,
  Settings,
  FileText,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: Array<'admin' | 'supervisor' | 'guard'>;
};

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart4,
    roles: ['admin', 'supervisor', 'guard'],
  },
  {
    title: 'Attendance',
    href: '/attendance',
    icon: ClipboardCheck,
    roles: ['admin', 'supervisor', 'guard'],
  },
  {
    title: 'Sites',
    href: '/sites',
    icon: MapPin,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: FileText,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Staff',
    href: '/guards',
    icon: Users,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Uniforms',
    href: '/uniforms',
    icon: Shirt,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: Shield,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Company Settings',
    href: '/company-settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { state, setOpen, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const isDesktop = useIsDesktop();
  const prevPathRef = useRef(location.pathname);

  const prefetchDashboard = usePrefetchDashboard();

  // Warm the dashboard cache as soon as the sidebar mounts.
  useEffect(() => {
    prefetchDashboard();
  }, [prefetchDashboard]);

  // Auto-close sidebar on navigation — only for tablet / mobile.
  // Desktop keeps the sidebar open (push layout).
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (!isDesktop) {
        if (isMobile) {
          setOpenMobile(false);
        } else {
          setOpen(false);
        }
      }
    }
  }, [location.pathname, isDesktop, isMobile, setOpen, setOpenMobile]);

  const filteredNavItems = profile
    ? navItems.filter(item => item.roles.includes(profile.role as 'admin' | 'supervisor' | 'guard'))
    : [];

  const isCollapsed = state === 'collapsed';

  // Desktop: collapsible="icon" (push layout, always visible)
  // Tablet/mobile: collapsible="offcanvas" (fully hidden, overlay drawer)
  return (
    <Sidebar
      collapsible={isDesktop ? 'icon' : 'offcanvas'}
      className="border-r"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isDesktop && isCollapsed ? item.title : undefined}
                      className="min-h-[44px] py-3"
                    >
                      <NavLink to={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Collapse/expand toggle — only visible on desktop */}
      {isDesktop && (
        <SidebarFooter className="border-t p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'sm'}
                onClick={toggleSidebar}
                className={cn(
                  'w-full transition-all',
                  isCollapsed ? 'justify-center' : 'justify-between'
                )}
              >
                {!isCollapsed && (
                  <span className="text-xs text-muted-foreground">Collapse</span>
                )}
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            )}
          </Tooltip>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}