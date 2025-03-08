
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  BarChart4,
  CalendarCheck,
  ChevronLeft,
  ClipboardCheck,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    title: 'Schedule',
    href: '/schedule',
    icon: CalendarCheck,
    roles: ['admin', 'supervisor', 'guard'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: Shield,
    roles: ['admin', 'supervisor'],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Filter out nav items based on user role
  const filteredNavItems = user 
    ? navItems.filter(item => item.roles.includes(user.role))
    : [];
  
  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-background border-r pt-16 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4">
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md bg-muted flex items-center text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Close Menu
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 px-3 py-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={({ isActive }) => cn(
                    "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-2.5 flex-shrink-0" />
                  {item.title}
                </NavLink>
              );
            })}
          </nav>
          
          <div className="border-t p-4">
            <div className="rounded-md bg-muted p-4">
              <div className="font-medium">Need Help?</div>
              <div className="text-sm text-muted-foreground mt-1">
                Check our documentation or contact support for assistance.
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
