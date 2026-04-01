
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  Moon,
  Sun,
  User,
  Menu
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsDesktop } from "@/hooks/use-mobile";

const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { toggleSidebar } = useSidebar();
  const isDesktop = useIsDesktop();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {/* Hamburger menu — only on tablet/iPad/mobile where sidebar is offcanvas */}
        {!isDesktop && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Open menu"
            className="h-11 w-11 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link to="/dashboard" className="flex items-center">
          <div className="rounded-md bg-primary p-1.5 mr-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            SecureGuard
          </h1>
        </Link>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="h-11 w-11">
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-11 w-11" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]">
                2
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start py-2">
                <div className="font-medium">Guard Absent</div>
                <div className="text-sm text-muted-foreground">
                  Mike Johnson is absent for Downtown Office day shift.
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  5 minutes ago
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start py-2">
                <div className="font-medium">Shift Replacement</div>
                <div className="text-sm text-muted-foreground">
                  Lisa Chen was assigned as replacement at Tech Park.
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  30 minutes ago
                </div>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="User menu">
                <Avatar className="h-10 w-10">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="Avatar" />
                  ) : (
                    <AvatarFallback>{getInitials(profile?.full_name || user?.email || 'U')}</AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.full_name || user?.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">{profile?.role || 'User'}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600">
                <User className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;
