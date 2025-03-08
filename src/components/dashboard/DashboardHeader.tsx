
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck } from 'lucide-react';
import { UserRole } from '@/types';

interface DashboardHeaderProps {
  userRole?: UserRole;
  selectedDay: 'today' | 'yesterday';
  setSelectedDay: (day: 'today' | 'yesterday') => void;
}

const DashboardHeader = ({ userRole, selectedDay, setSelectedDay }: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {userRole === 'admin' ? 'Admin Dashboard' : 
           userRole === 'supervisor' ? 'Supervisor Dashboard' : 'Guard Dashboard'}
        </h2>
        <p className="text-muted-foreground">
          {selectedDay === 'today' ? 'Today\'s overview and statistics' : 'Yesterday\'s overview and statistics'}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Tabs defaultValue={selectedDay} onValueChange={(value) => setSelectedDay(value as 'today' | 'yesterday')}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button asChild>
          <Link to="/attendance">
            <CalendarCheck className="h-4 w-4 mr-2" />
            Mark Attendance
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
