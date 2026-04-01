import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface DashboardHeaderProps {
  userName?: string;
}

const DashboardHeader = ({ userName }: DashboardHeaderProps) => {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userName || 'Admin';

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="default"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-11 px-4"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button size="default" asChild className="h-11 px-4">
          <Link to="/attendance">
            <CalendarCheck className="h-4 w-4 mr-1.5" />
            Mark Attendance
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
