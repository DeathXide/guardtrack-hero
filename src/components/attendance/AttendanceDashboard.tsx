import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Camera, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTodayAttendance, useAttendanceRecords, useEmployeeTypes } from '@/hooks/useAttendance';
import { fetchSites } from '@/lib/localService';
import { useQuery } from '@tanstack/react-query';
import AttendanceCheckInOut from './AttendanceCheckInOut';
import AttendanceTable from './AttendanceTable';
// TODO: Create these components
const AttendanceAnalytics = ({ siteId, employeeType }: any) => <div>Analytics coming soon...</div>;
const LeaveRequestManager = ({ employeeType }: any) => <div>Leave management coming soon...</div>;
const AttendanceSettingsManager = ({ siteId }: any) => <div>Settings coming soon...</div>;
import { format } from 'date-fns';

const AttendanceDashboard: React.FC = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>('');
  
  const { data: sites = [], isLoading: sitesLoading } = useQuery({ queryKey: ['sites'], queryFn: fetchSites });
  const { data: employeeTypes = [], isLoading: typesLoading } = useEmployeeTypes();
  const { data: todayAttendance = [], isLoading: todayLoading } = useTodayAttendance(selectedSiteId);
  
  // Calculate today's stats
  const presentCount = todayAttendance.filter(r => r.status === 'present').length;
  const absentCount = todayAttendance.filter(r => r.status === 'absent').length;
  const lateCount = todayAttendance.filter(r => r.status === 'late').length;
  const pendingCheckOut = todayAttendance.filter(r => r.actual_start_time && !r.actual_end_time).length;
  
  if (sitesLoading || typesLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground mt-2">
          Track employee attendance, manage check-ins, and monitor workforce presence
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedEmployeeType} onValueChange={setSelectedEmployeeType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Employee Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {employeeTypes.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Today's Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
            <p className="text-xs text-muted-foreground">Checked in employees</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount}</div>
            <p className="text-xs text-muted-foreground">Did not check in</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lateCount}</div>
            <p className="text-xs text-muted-foreground">Arrived late</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Checkout</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingCheckOut}</div>
            <p className="text-xs text-muted-foreground">Not checked out</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="checkinout">Check In/Out</TabsTrigger>
          <TabsTrigger value="records">All Records</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Attendance - {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                Real-time view of today's employee attendance across all sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="text-center py-8">Loading today's attendance...</div>
              ) : (
                <AttendanceTable 
                  data={todayAttendance} 
                  showActions={true}
                  realTime={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkinout" className="space-y-4">
          <AttendanceCheckInOut 
            siteId={selectedSiteId}
            employeeType={selectedEmployeeType}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <AttendanceAnalytics 
            siteId={selectedSiteId}
            employeeType={selectedEmployeeType}
          />
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <LeaveRequestManager 
            employeeType={selectedEmployeeType}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AttendanceSettingsManager 
            siteId={selectedSiteId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceDashboard;