import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Info, Copy, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi } from '@/lib/guardsApi';
import { shiftsApi } from '@/lib/shiftsApi';
import { attendanceApi } from '@/lib/attendanceApi';

interface AttendanceMarkingProps {
  preselectedSiteId?: string;
}

const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const queryClient = useQueryClient();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Fetch data using the new APIs
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesApi.getAllSites()
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: () => guardsApi.getAllGuards()
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? shiftsApi.getShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', formattedDate],
    queryFn: () => attendanceApi.getAttendanceByDate(formattedDate),
    enabled: !!formattedDate
  });

  // Get selected site data
  const selectedSiteData = sites.find(site => site.id === selectedSite);

  // Calculate day and night slots from staffing requirements
  const daySlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.day_slots, 0) || 0;
  const nightSlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.night_slots, 0) || 0;

  // Get assigned guards for each shift type (memoized to prevent re-calculation)
  const { dayShiftGuards, nightShiftGuards } = useMemo(() => {
    const dayGuards = guards.filter(guard => 
      shifts.some(shift => shift.type === 'day' && shift.guard_id === guard.id)
    );
    
    const nightGuards = guards.filter(guard => 
      shifts.some(shift => shift.type === 'night' && shift.guard_id === guard.id)
    );

    return { dayShiftGuards: dayGuards, nightShiftGuards: nightGuards };
  }, [guards, shifts]);

  // Get present guards from attendance records (memoized)
  const { presentDayGuards, presentNightGuards } = useMemo(() => {
    const dayPresent = attendanceRecords
      .filter(record => {
        return record.status === 'present' && 
               record.shift_type === 'day' && 
               record.site_id === selectedSite;
      })
      .map(record => record.employee_id);

    const nightPresent = attendanceRecords
      .filter(record => {
        return record.status === 'present' && 
               record.shift_type === 'night' && 
               record.site_id === selectedSite;
      })
      .map(record => record.employee_id);

    return { presentDayGuards: dayPresent, presentNightGuards: nightPresent };
  }, [attendanceRecords, selectedSite]);

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ guardId, shiftType }: { guardId: string; shiftType: 'day' | 'night' }) => {
      // Check if guard is already marked elsewhere
      const isMarkedElsewhere = await attendanceApi.isGuardMarkedElsewhere(
        guardId,
        formattedDate,
        shiftType,
        selectedSite
      );

      if (isMarkedElsewhere) {
        throw new Error('Guard is already marked present at another site for this shift');
      }

      // Create attendance record
      return attendanceApi.createAttendanceRecord({
        employee_id: guardId,
        site_id: selectedSite,
        attendance_date: formattedDate,
        shift_type: shiftType,
        employee_type: 'guard',
        status: 'present',
        scheduled_start_time: shiftType === 'day' ? `${formattedDate}T08:00:00` : `${formattedDate}T20:00:00`,
        scheduled_end_time: shiftType === 'day' ? `${formattedDate}T20:00:00` : `${format(subDays(new Date(formattedDate), -1), 'yyyy-MM-dd')}T08:00:00`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      toast.success('Attendance marked successfully');
    },
    onError: (error: any) => {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    }
  });

  // Unmark attendance mutation
  const unmarkAttendanceMutation = useMutation({
    mutationFn: async ({ guardId, shiftType }: { guardId: string; shiftType: 'day' | 'night' }) => {
      const record = attendanceRecords.find(record => 
        record.employee_id === guardId && 
        record.shift_type === shiftType &&
        record.site_id === selectedSite &&
        record.status === 'present'
      );
      
      if (!record) {
        throw new Error('Attendance record not found');
      }

      return attendanceApi.deleteAttendanceRecord(record.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      toast.success('Attendance unmarked successfully');
    },
    onError: (error: any) => {
      console.error('Error unmarking attendance:', error);
      toast.error('Failed to unmark attendance');
    }
  });

  const handleGuardToggle = async (guardId: string, shiftType: 'day' | 'night') => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
    const presentGuards = shiftType === 'day' ? presentDayGuards : presentNightGuards;
    const isPresent = presentGuards.includes(guardId);

    // Check if guard is assigned to this shift
    const isAssigned = shifts.some(shift => 
      shift.guard_id === guardId && 
      shift.type === shiftType && 
      shift.site_id === selectedSite
    );

    if (!isAssigned) {
      toast.error(`Guard is not assigned to ${shiftType} shift at this site. Please assign them first in the Guard Allocation tab.`);
      return;
    }

    if (isPresent) {
      // Unmark attendance
      await unmarkAttendanceMutation.mutateAsync({ guardId, shiftType });
    } else {
      // Check slot limit
      if (presentGuards.length >= maxSlots) {
        toast.error(`Cannot mark more than ${maxSlots} guards present for ${shiftType} shift`);
        return;
      }

      // Mark attendance
      await markAttendanceMutation.mutateAsync({ guardId, shiftType });
    }
  };

  const handleCopyYesterday = async () => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    
    try {
      const result = await attendanceApi.copyAttendanceFromDate(yesterday, formattedDate, selectedSite);
      if (result.copied > 0) {
        toast.success(`Copied ${result.copied} attendance records from yesterday`);
        refetchAttendance();
      } else {
        toast.info('No attendance records found for yesterday at this site');
      }
    } catch (error) {
      console.error('Error copying yesterday\'s attendance:', error);
      toast.error('Failed to copy yesterday\'s attendance');
    }
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (sites.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No sites available</AlertTitle>
        <AlertDescription>
          Please create sites first before marking attendance. Go to Sites page to add a new site.
        </AlertDescription>
      </Alert>
    );
  }

  if (guards.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No guards available</AlertTitle>
        <AlertDescription>
          Please create guards first before marking attendance. Go to Guards page to add new guards.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <CardDescription>
            Select date and site, then mark guard attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
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
                      {site.site_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyYesterday}
                  disabled={!selectedSite}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Yesterday
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedSite ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No site selected</AlertTitle>
          <AlertDescription>
            Please select a site to view and mark attendance
          </AlertDescription>
        </Alert>
      ) : shiftsLoading ? (
        <div className="flex items-center justify-center h-64">Loading shifts...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day Shift Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Day Shift
                <div className="text-sm text-muted-foreground">
                  {presentDayGuards.length} / {daySlots} present
                </div>
              </CardTitle>
              <CardDescription>8:00 AM - 8:00 PM</CardDescription>
            </CardHeader>
            <CardContent>
              {dayShiftGuards.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No guards assigned to day shift. Go to Guard Allocation tab to assign guards.
                </div>
              ) : (
                <div className="space-y-2">
                  {dayShiftGuards.map(guard => {
                    const isPresent = presentDayGuards.includes(guard.id);
                    return (
                      <div key={guard.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{guard.name}</div>
                          <div className="text-sm text-muted-foreground">{guard.badge_number}</div>
                        </div>
                        <Button
                          size="sm"
                          variant={isPresent ? "default" : "outline"}
                          onClick={() => handleGuardToggle(guard.id, 'day')}
                          disabled={markAttendanceMutation.isPending || unmarkAttendanceMutation.isPending}
                        >
                          {isPresent ? 'Present' : 'Mark Present'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Night Shift Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Night Shift
                <div className="text-sm text-muted-foreground">
                  {presentNightGuards.length} / {nightSlots} present
                </div>
              </CardTitle>
              <CardDescription>8:00 PM - 8:00 AM</CardDescription>
            </CardHeader>
            <CardContent>
              {nightShiftGuards.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No guards assigned to night shift. Go to Guard Allocation tab to assign guards.
                </div>
              ) : (
                <div className="space-y-2">
                  {nightShiftGuards.map(guard => {
                    const isPresent = presentNightGuards.includes(guard.id);
                    return (
                      <div key={guard.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{guard.name}</div>
                          <div className="text-sm text-muted-foreground">{guard.badge_number}</div>
                        </div>
                        <Button
                          size="sm"
                          variant={isPresent ? "default" : "outline"}
                          onClick={() => handleGuardToggle(guard.id, 'night')}
                          disabled={markAttendanceMutation.isPending || unmarkAttendanceMutation.isPending}
                        >
                          {isPresent ? 'Present' : 'Mark Present'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarking;