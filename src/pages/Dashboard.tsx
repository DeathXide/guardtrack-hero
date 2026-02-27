
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, MapPin, Check, Clock } from 'lucide-react';
import { 
  attendanceRecords, 
  guards, 
  sites, 
  getShiftsBySite, 
  getAttendanceByDate, 
  getGuardById, 
  getSiteById 
} from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import { m } from 'motion/react';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import AbsenceAlerts from '@/components/dashboard/AbsenceAlerts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickActions from '@/components/dashboard/QuickActions';

const Dashboard = () => {
  const { profile } = useAuth();
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading delay
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Get today and yesterday dates
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Get attendance records for selected day
  const dateToShow = selectedDay === 'today' ? today : yesterday;
  const dayRecords = getAttendanceByDate(dateToShow);
  
  // Calculate statistics
  const totalGuards = guards.filter(g => g.status === 'active').length;
  const totalSites = sites.length;
  const totalShifts = sites.reduce((acc, site) => acc + site.daySlots + site.nightSlots, 0);
  
  const presentCount = dayRecords.filter(r => r.status === 'present' || r.status === 'replaced').length;
  const absentCount = dayRecords.filter(r => r.status === 'absent').length;
  const attendanceRate = dayRecords.length > 0 
    ? Math.round((presentCount / dayRecords.length) * 100) 
    : 0;
  
  // Chart data
  const siteAttendanceData = sites.map(site => {
    const siteShifts = getShiftsBySite(site.id);
    const siteShiftIds = siteShifts.map(shift => shift.id);
    
    const siteRecords = dayRecords.filter(record => siteShiftIds.includes(record.shiftId));
    const presentAtSite = siteRecords.filter(r => r.status === 'present' || r.status === 'replaced').length;
    const attendanceRate = siteRecords.length > 0 
      ? Math.round((presentAtSite / siteRecords.length) * 100) 
      : 0;
    
    return {
      name: site.name,
      attendance: attendanceRate,
    };
  });
  
  // Get alerts (absences)
  const absenceAlerts = dayRecords
    .filter(record => record.status === 'absent')
    .map(record => {
      const guard = getGuardById(record.guardId);
      const shift = getShiftsBySite(record.shiftId.split('-')[0])[0];
      const site = shift ? getSiteById(shift.siteId) : undefined;
      
      return {
        record,
        guard,
        site,
        shiftType: shift?.type || 'unknown',
      };
    });
  
  return (
    <div className="space-y-8 animate-fade-in">
      <DashboardHeader 
        userRole={profile?.role as 'admin' | 'supervisor' | 'guard'}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
      />
      
      <m.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } }
        }}
      >
        {[
          { title: "Total Guards", value: totalGuards, description: "Active security personnel", icon: Users },
          { title: "Sites", value: totalSites, description: "Secured locations", icon: MapPin },
          { title: "Attendance Rate", value: `${attendanceRate}%`, description: "Present or replaced shifts", icon: Check },
          { title: "Total Shifts", value: totalShifts, description: "Across all sites", icon: Clock },
        ].map((card) => (
          <m.div
            key={card.title}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <StatCard {...card} />
          </m.div>
        ))}
      </m.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttendanceChart data={siteAttendanceData} />
        <AbsenceAlerts alerts={absenceAlerts} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivity 
          records={dayRecords} 
          getGuardById={getGuardById}
          getSiteById={getSiteById}
          getShiftsBySite={getShiftsBySite}
        />
        <QuickActions />
      </div>
    </div>
  );
};

export default Dashboard;
