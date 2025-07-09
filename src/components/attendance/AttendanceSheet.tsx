import React, { useState, useMemo } from 'react';
import { format, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchSites, fetchGuards, fetchShiftsBySite, fetchAttendanceRecords } from '@/lib/localService';
import { Site, Guard, AttendanceRecord, Shift } from '@/types';
import { cn } from '@/lib/utils';

interface AttendanceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSiteId?: string;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  isOpen,
  onClose,
  preselectedSiteId
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>(preselectedSiteId || '');

  const currentMonth = format(selectedDate, 'yyyy-MM');
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const { data: guards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const { data: allAttendanceRecords = [] } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: fetchAttendanceRecords
  });

  // Filter attendance records for the selected month and site
  const attendanceRecords = useMemo(() => {
    if (!selectedSite) return [];
    
    return allAttendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      const isInMonth = recordDate >= monthStart && recordDate <= monthEnd;
      
      // Check if this record belongs to the selected site
      const shift = shifts.find(s => s.id === record.shiftId);
      const isFromSite = shift?.siteId === selectedSite;
      
      return isInMonth && isFromSite;
    });
  }, [allAttendanceRecords, selectedSite, monthStart, monthEnd, shifts]);

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  
  // Get guards assigned to this site
  const siteGuards = guards.filter(guard => 
    shifts.some(shift => shift.guardId === guard.id)
  );

  // Create attendance matrix
  const attendanceMatrix = useMemo(() => {
    console.log('Building attendance matrix with:', {
      siteGuards: siteGuards.length,
      attendanceRecords: attendanceRecords.length,
      shifts: shifts.length,
      selectedSite
    });
    
    const matrix: Record<string, Record<string, { present: boolean; shiftType: string }[]>> = {};
    
    siteGuards.forEach(guard => {
      matrix[guard.id] = {};
      daysInMonth.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        matrix[guard.id][dayKey] = [];
      });
    });

    attendanceRecords.forEach(record => {
      console.log('Processing attendance record:', record);
      if (record.status === 'present') {
        const shift = shifts.find(s => s.id === record.shiftId);
        console.log('Found shift for record:', shift);
        if (shift && matrix[record.guardId] && matrix[record.guardId][record.date]) {
          matrix[record.guardId][record.date].push({
            present: true,
            shiftType: shift.type
          });
          console.log('Added to matrix:', record.guardId, record.date, shift.type);
        }
      }
    });

    console.log('Final matrix:', matrix);
    return matrix;
  }, [siteGuards, daysInMonth, attendanceRecords, shifts]);

  const exportToExcel = () => {
    if (!selectedSiteData) return;

    // Create CSV content
    const headers = ['Guard Name', 'Badge Number', ...daysInMonth.map(day => format(day, 'dd'))];
    const csvContent = [
      headers.join(','),
      ...siteGuards.map(guard => {
        const row = [
          `"${guard.name}"`,
          `"${guard.badgeNumber || 'N/A'}"`,
          ...daysInMonth.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const attendance = attendanceMatrix[guard.id]?.[dayKey] || [];
            if (attendance.length === 0) return '""';
            return `"${attendance.map(a => a.shiftType.charAt(0).toUpperCase()).join(',')}"`;
          })
        ];
        return row.join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-${selectedSiteData.name}-${format(selectedDate, 'yyyy-MM')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance Sheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month Selection */}
            <div className="space-y-2">
              <Label>Month</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'MMMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Site Selection */}
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Button */}
            <div className="space-y-2">
              <Label>Export</Label>
              <Button 
                onClick={exportToExcel}
                disabled={!selectedSite || siteGuards.length === 0}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* Attendance Table */}
          {selectedSite && siteGuards.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left sticky left-0 bg-muted z-10 min-w-[150px]">
                      Guard Name
                    </th>
                    <th className="border border-border p-2 text-left sticky left-[150px] bg-muted z-10 min-w-[100px]">
                      Badge
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day.toISOString()} className="border border-border p-1 text-center min-w-[40px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{format(day, 'dd')}</span>
                          <span className="text-xs text-muted-foreground">{format(day, 'EEE')}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {siteGuards.map(guard => (
                    <tr key={guard.id} className="hover:bg-muted/50">
                      <td className="border border-border p-2 sticky left-0 bg-background z-10 font-medium">
                        {guard.name}
                      </td>
                      <td className="border border-border p-2 sticky left-[150px] bg-background z-10 text-muted-foreground">
                        {guard.badgeNumber || 'N/A'}
                      </td>
                      {daysInMonth.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const attendance = attendanceMatrix[guard.id]?.[dayKey] || [];
                        
                        return (
                          <td key={day.toISOString()} className="border border-border p-1 text-center">
                            {attendance.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {attendance.map((att, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant={att.shiftType === 'day' ? 'default' : 'secondary'}
                                    className="text-xs px-1 py-0"
                                  >
                                    {att.shiftType === 'day' ? 'D' : 'N'}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selectedSite ? (
            <div className="text-center py-8 text-muted-foreground">
              No guards assigned to this site
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please select a site to view attendance sheet
            </div>
          )}

          {/* Legend */}
          {selectedSite && siteGuards.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Legend:</span>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs px-1 py-0">D</Badge>
                <span>Day Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-1 py-0">N</Badge>
                <span>Night Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">-</span>
                <span>Absent</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceSheet;