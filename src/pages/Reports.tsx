
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DownloadCloud, FileText, User, Calendar, Building, RefreshCw } from 'lucide-react';
import { attendanceRecords, guards, sites } from '@/lib/data';
import { AttendanceReport, SiteReport } from '@/types';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Generate attendance report data
  const attendanceReportData: AttendanceReport[] = guards.map(guard => {
    const guardRecords = attendanceRecords.filter(record => record.guardId === guard.id);
    const totalShifts = guardRecords.length;
    const presentCount = guardRecords.filter(r => r.status === 'present').length;
    const absentCount = guardRecords.filter(r => r.status === 'absent').length;
    const replacedCount = guardRecords.filter(r => r.status === 'replaced').length;
    const attendancePercentage = totalShifts > 0 
      ? Math.round(((presentCount + replacedCount) / totalShifts) * 100) 
      : 0;
    
    return {
      guardId: guard.id,
      guardName: guard.name,
      totalShifts,
      presentCount,
      absentCount,
      replacedCount,
      attendancePercentage,
    };
  }).filter(report => report.totalShifts > 0);
  
  // Generate site report data
  const siteReportData: SiteReport[] = sites.map(site => {
    const dayFilled = Math.floor(Math.random() * (site.daySlots + 1));
    const nightFilled = Math.floor(Math.random() * (site.nightSlots + 1));
    
    const dayPercentage = site.daySlots > 0 ? Math.round((dayFilled / site.daySlots) * 100) : 0;
    const nightPercentage = site.nightSlots > 0 ? Math.round((nightFilled / site.nightSlots) * 100) : 0;
    const overallPercentage = (site.daySlots + site.nightSlots > 0) 
      ? Math.round(((dayFilled + nightFilled) / (site.daySlots + site.nightSlots)) * 100) 
      : 0;
    
    return {
      siteId: site.id,
      siteName: site.name,
      daySlots: site.daySlots,
      nightSlots: site.nightSlots,
      dayFilled,
      nightFilled,
      dayPercentage,
      nightPercentage,
      overallPercentage,
    };
  });
  
  // Sort by attendance percentage
  attendanceReportData.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
  
  // Pie chart data
  const attendanceStatusData = [
    { name: 'Present', value: attendanceRecords.filter(r => r.status === 'present').length, color: '#10b981' },
    { name: 'Absent', value: attendanceRecords.filter(r => r.status === 'absent').length, color: '#ef4444' },
    { name: 'Replaced', value: attendanceRecords.filter(r => r.status === 'replaced').length, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            View attendance statistics and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <DownloadCloud className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="attendance" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Attendance Reports</span>
          </TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Site Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Attendance Performance</CardTitle>
                <CardDescription>
                  Guard attendance percentage by individual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attendanceReportData.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis type="category" dataKey="guardName" width={120} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Attendance Rate']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Bar 
                        dataKey="attendancePercentage" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]} 
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
                <CardDescription>
                  Overall attendance distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {attendanceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [value, 'Count']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex justify-center gap-4 mt-4">
                  {attendanceStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-xs">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance Report</CardTitle>
              <CardDescription>
                Complete breakdown of guard attendance statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guard Name</TableHead>
                    <TableHead className="text-right">Total Shifts</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Replaced</TableHead>
                    <TableHead className="text-right">Attendance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceReportData.map((report) => (
                    <TableRow key={report.guardId}>
                      <TableCell className="font-medium">{report.guardName}</TableCell>
                      <TableCell className="text-right">{report.totalShifts}</TableCell>
                      <TableCell className="text-right">{report.presentCount}</TableCell>
                      <TableCell className="text-right">{report.absentCount}</TableCell>
                      <TableCell className="text-right">{report.replacedCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span 
                          className={`px-2 py-1 rounded-md text-xs ${
                            report.attendancePercentage >= 90 ? 'bg-success/10 text-success' :
                            report.attendancePercentage >= 70 ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {report.attendancePercentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Coverage Report</CardTitle>
              <CardDescription>
                Shift coverage statistics for each site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site Name</TableHead>
                    <TableHead className="text-right">Day Slots</TableHead>
                    <TableHead className="text-right">Day Filled</TableHead>
                    <TableHead className="text-right">Night Slots</TableHead>
                    <TableHead className="text-right">Night Filled</TableHead>
                    <TableHead className="text-right">Coverage Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteReportData.map((report) => (
                    <TableRow key={report.siteId}>
                      <TableCell className="font-medium">{report.siteName}</TableCell>
                      <TableCell className="text-right">{report.daySlots}</TableCell>
                      <TableCell className="text-right">
                        {report.dayFilled}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({report.dayPercentage}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{report.nightSlots}</TableCell>
                      <TableCell className="text-right">
                        {report.nightFilled}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({report.nightPercentage}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span 
                          className={`px-2 py-1 rounded-md text-xs ${
                            report.overallPercentage >= 90 ? 'bg-success/10 text-success' :
                            report.overallPercentage >= 70 ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {report.overallPercentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Day Shift Coverage</CardTitle>
                <CardDescription>
                  Day shift fill rate by site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={siteReportData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="siteName" />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Fill Rate']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Bar 
                        dataKey="dayPercentage" 
                        name="Day Shift Coverage"
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Night Shift Coverage</CardTitle>
                <CardDescription>
                  Night shift fill rate by site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={siteReportData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="siteName" />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Fill Rate']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Bar 
                        dataKey="nightPercentage" 
                        name="Night Shift Coverage"
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
