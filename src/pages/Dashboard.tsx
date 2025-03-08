
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent } from '@/components/ui/tabs';
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

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import AbsenceAlerts from '@/components/dashboard/AbsenceAlerts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import QuickActions from '@/components/dashboard/QuickActions';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  
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
        userRole={user?.role}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Guards" 
          value={totalGuards} 
          description="Active security personnel" 
          icon={Users} 
        />
        
        <StatCard 
          title="Sites" 
          value={totalSites} 
          description="Secured locations" 
          icon={MapPin} 
        />
        
        <StatCard 
          title="Attendance Rate" 
          value={`${attendanceRate}%`} 
          description="Present or replaced shifts" 
          icon={Check} 
        />
        
        <StatCard 
          title="Total Shifts" 
          value={totalShifts} 
          description="Across all sites" 
          icon={Clock} 
        />
      </div>
      
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
