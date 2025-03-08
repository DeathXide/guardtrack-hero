
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart4, 
  CalendarCheck, 
  Check, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  User, 
  Users, 
  X 
} from 'lucide-react';
import { 
  attendanceRecords, 
  guards, 
  sites, 
  getShiftsBySite, 
  getAttendanceByDate, 
  getGuardById, 
  getSiteById 
} from '@/lib/data';
import { AttendanceRecord, Guard, Site } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {user?.role === 'admin' ? 'Admin Dashboard' : 
             user?.role === 'supervisor' ? 'Supervisor Dashboard' : 'Guard Dashboard'}
          </h2>
          <p className="text-muted-foreground">
            {selectedDay === 'today' ? 'Today\'s overview and statistics' : 'Yesterday\'s overview and statistics'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <TabsList>
            <TabsTrigger 
              value="today" 
              onClick={() => setSelectedDay('today')}
              className={selectedDay === 'today' ? 'bg-primary text-primary-foreground' : ''}
            >
              Today
            </TabsTrigger>
            <TabsTrigger 
              value="yesterday" 
              onClick={() => setSelectedDay('yesterday')}
              className={selectedDay === 'yesterday' ? 'bg-primary text-primary-foreground' : ''}
            >
              Yesterday
            </TabsTrigger>
          </TabsList>
          
          <Button asChild>
            <Link to="/attendance">
              <CalendarCheck className="h-4 w-4 mr-2" />
              Mark Attendance
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGuards}</div>
            <p className="text-xs text-muted-foreground">
              Active security personnel
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSites}</div>
            <p className="text-xs text-muted-foreground">
              Secured locations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Present or replaced shifts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              Across all sites
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance by Site</CardTitle>
            <CardDescription>
              Present and replacement rate for each site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={siteAttendanceData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Attendance']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar 
                    dataKey="attendance" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Absence Alerts</CardTitle>
              <Badge variant="outline" className="ml-2">
                {absenceAlerts.length} {absenceAlerts.length === 1 ? 'alert' : 'alerts'}
              </Badge>
            </div>
            <CardDescription>
              Guards who are absent or need a replacement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {absenceAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <Check className="h-8 w-8 text-success mb-2" />
                  <p className="text-sm font-medium">All guards present!</p>
                  <p className="text-xs text-muted-foreground">
                    No absences to report for this day
                  </p>
                </div>
              ) : (
                absenceAlerts.map(({ record, guard, site, shiftType }) => (
                  <Card key={record.id} className="border border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{guard?.name || 'Unknown Guard'}</p>
                            <Badge variant="destructive" className="ml-2 h-5 text-xs">
                              Absent
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {site?.name || 'Unknown Site'} • {shiftType === 'day' ? 'Day Shift' : 'Night Shift'}
                          </p>
                          <div className="pt-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                              <User className="h-3 w-3 mr-1" />
                              Assign Replacement
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest attendance records and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {dayRecords.slice(0, 5).map((record) => {
                const guard = getGuardById(record.guardId);
                const replacementGuard = record.replacementGuardId ? getGuardById(record.replacementGuardId) : null;
                const shift = getShiftsBySite(record.shiftId.split('-')[0])[0];
                const site = shift ? getSiteById(shift.siteId) : undefined;
                
                return (
                  <div key={record.id} className="flex items-start space-x-4 py-3 border-b last:border-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      record.status === 'present' ? 'bg-success/10 text-success' :
                      record.status === 'replaced' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {record.status === 'present' ? (
                        <Check className="h-4 w-4" />
                      ) : record.status === 'replaced' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{guard?.name || 'Unknown Guard'}</p>
                        <div>
                          {record.status === 'present' ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">Present</Badge>
                          ) : record.status === 'replaced' ? (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Replaced</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {site?.name || 'Unknown Site'} • {shift?.type === 'day' ? 'Day Shift' : 'Night Shift'}
                      </p>
                      
                      {record.status === 'replaced' && replacementGuard && (
                        <div className="mt-2 text-xs bg-muted p-2 rounded-md">
                          <span className="font-medium">Replaced by:</span> {replacementGuard.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link to="/attendance">View All Records</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link to="/attendance">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Mark Today's Attendance
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/guards">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Guards
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/sites">
                  <MapPin className="h-4 w-4 mr-2" />
                  View Sites
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/reports">
                  <BarChart4 className="h-4 w-4 mr-2" />
                  Generate Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
