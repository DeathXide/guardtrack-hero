import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  BarChart4,
  CalendarCheck,
  ClipboardCheck,
  MapPin,
  Shield,
  Users,
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
    title: 'Guards',
    href: '/guards',
    icon: Users,
    roles: ['admin', 'supervisor'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: Shield,
    roles: ['admin', 'supervisor'],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  
  const filteredNavItems = user 
    ? navItems.filter(item => item.roles.includes(user.role))
    : [];
  
  const isCollapsed = state === 'collapsed';
  
  return (
    <Sidebar collapsible="icon" className="border-r">
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
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="rounded-md bg-muted p-3">
          {!isCollapsed && (
            <>
              <div className="font-medium text-sm">Need Help?</div>
              <div className="text-xs text-muted-foreground mt-1">
                Check our documentation or contact support.
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}