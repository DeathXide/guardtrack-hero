import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Info, Copy, User, UserPlus, X, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi, type Guard } from '@/lib/guardsApi';
import { shiftsApi } from '@/lib/shiftsApi';
import { attendanceApi } from '@/lib/attendanceApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SlotBasedAttendanceMarkingProps {
  preselectedSiteId?: string;
}

interface SlotData {
  id: string;
  shiftType: 'day' | 'night';
  slotNumber: number;
  assignedGuard?: {
    id: string;
    name: string;
    badge_number: string;
  };
  isPresent: boolean;
}

const SlotBasedAttendanceMarking: React.FC<SlotBasedAttendanceMarkingProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectionModal, setSelectionModal] = useState<{
    isOpen: boolean;
    slotId: string;
    shiftType: 'day' | 'night';
  }>({ isOpen: false, slotId: '', shiftType: 'day' });
  const queryClient = useQueryClient();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Fetch data using the APIs
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

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', formattedDate],
    queryFn: () => attendanceApi.getAttendanceByDate(formattedDate),
    enabled: !!formattedDate
  });

  // Get selected site data
  const selectedSiteData = sites.find(site => site.id === selectedSite);

  // Calculate day and night slots from staffing requirements
  const daySlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.day_slots, 0) || 0;
  const nightSlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.night_slots, 0) || 0;

  // Generate slot data based on staffing requirements
  const slotsData = useMemo(() => {
    const slots: SlotData[] = [];
    const dayShifts = shifts.filter(shift => shift.type === 'day' && shift.site_id === selectedSite);
    const nightShifts = shifts.filter(shift => shift.type === 'night' && shift.site_id === selectedSite);

    // Create day shift slots
    for (let i = 1; i <= daySlots; i++) {
      const slotId = `day-${i}`;
      const assignedShift = dayShifts[i - 1]; // Get the shift for this slot position
      
      const assignedGuard = assignedShift ? guards.find(guard => guard.id === assignedShift.guard_id) : undefined;
      
      const attendanceRecord = attendanceRecords.find(record => 
        record.employee_id === assignedGuard?.id && 
        record.shift_type === 'day' &&
        record.site_id === selectedSite &&
        record.status === 'present'
      );

      slots.push({
        id: slotId,
        shiftType: 'day',
        slotNumber: i,
        assignedGuard: assignedGuard ? {
          id: assignedGuard.id,
          name: assignedGuard.name,
          badge_number: assignedGuard.badge_number
        } : undefined,
        isPresent: !!attendanceRecord
      });
    }

    // Create night shift slots
    for (let i = 1; i <= nightSlots; i++) {
      const slotId = `night-${i}`;
      const assignedShift = nightShifts[i - 1]; // Get the shift for this slot position
      
      const assignedGuard = assignedShift ? guards.find(guard => guard.id === assignedShift.guard_id) : undefined;
      
      const attendanceRecord = attendanceRecords.find(record => 
        record.employee_id === assignedGuard?.id && 
        record.shift_type === 'night' &&
        record.site_id === selectedSite &&
        record.status === 'present'
      );

      slots.push({
        id: slotId,
        shiftType: 'night',
        slotNumber: i,
        assignedGuard: assignedGuard ? {
          id: assignedGuard.id,
          name: assignedGuard.name,
          badge_number: assignedGuard.badge_number
        } : undefined,
        isPresent: !!attendanceRecord
      });
    }

    return slots;
  }, [daySlots, nightSlots, shifts, guards, attendanceRecords, selectedSite]);

  // Filter available guards (those not assigned to any slot)
  const availableGuards = useMemo(() => {
    const assignedGuardIds = slotsData
      .filter(slot => slot.assignedGuard)
      .map(slot => slot.assignedGuard!.id);
    
    return guards.filter(guard => 
      guard.status === 'active' && 
      !assignedGuardIds.includes(guard.id)
    );
  }, [guards, slotsData]);

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

  // Assign guard to slot mutation
  const assignGuardMutation = useMutation({
    mutationFn: async ({ guardId, slotId, shiftType }: { guardId: string; slotId: string; shiftType: 'day' | 'night' }) => {
      // First check if there's an existing shift for this slot and remove it
      const existingShift = shifts.find(shift => 
        shift.site_id === selectedSite && 
        shift.type === shiftType
      );

      if (existingShift) {
        await shiftsApi.deleteShift(existingShift.id);
      }

      // Create new shift assignment
      return shiftsApi.createShift({
        site_id: selectedSite,
        guard_id: guardId,
        type: shiftType
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Guard assigned to slot successfully');
      setSelectionModal({ isOpen: false, slotId: '', shiftType: 'day' });
    },
    onError: (error: any) => {
      console.error('Error assigning guard:', error);
      toast.error('Failed to assign guard to slot');
    }
  });

  // Remove guard from slot mutation
  const removeGuardMutation = useMutation({
    mutationFn: async ({ guardId, shiftType }: { guardId: string; shiftType: 'day' | 'night' }) => {
      const shift = shifts.find(shift => 
        shift.guard_id === guardId && 
        shift.type === shiftType &&
        shift.site_id === selectedSite
      );

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Also remove attendance record if exists
      const attendanceRecord = attendanceRecords.find(record => 
        record.employee_id === guardId && 
        record.shift_type === shiftType &&
        record.site_id === selectedSite
      );

      if (attendanceRecord) {
        await attendanceApi.deleteAttendanceRecord(attendanceRecord.id);
      }

      return shiftsApi.deleteShift(shift.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      toast.success('Guard removed from slot successfully');
    },
    onError: (error: any) => {
      console.error('Error removing guard from slot:', error);
      toast.error('Failed to remove guard from slot');
    }
  });

  const handleOpenSelection = (slotId: string, shiftType: 'day' | 'night') => {
    setSelectionModal({ isOpen: true, slotId, shiftType });
  };

  const handleAssignGuard = async (guardId: string) => {
    if (!selectionModal.slotId) return;
    
    await assignGuardMutation.mutateAsync({
      guardId,
      slotId: selectionModal.slotId,
      shiftType: selectionModal.shiftType
    });
  };

  const handleRemoveGuard = async (guardId: string, shiftType: 'day' | 'night') => {
    await removeGuardMutation.mutateAsync({ guardId, shiftType });
  };

  const handleMarkPresent = async (guardId: string, shiftType: 'day' | 'night') => {
    await markAttendanceMutation.mutateAsync({ guardId, shiftType });
  };

  const handleMarkAbsent = async (guardId: string, shiftType: 'day' | 'night') => {
    await unmarkAttendanceMutation.mutateAsync({ guardId, shiftType });
  };

  const renderSlot = (slot: SlotData) => {
    const isLoading = markAttendanceMutation.isPending || unmarkAttendanceMutation.isPending;

    return (
      <Card key={slot.id} className="border-2 transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{slot.shiftType === 'day' ? 'Day' : 'Night'} Slot {slot.slotNumber}</span>
            {slot.isPresent && (
              <Badge className="bg-green-100 text-green-800 border-green-300">Present</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slot.assignedGuard ? (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${slot.isPresent ? 'bg-green-50 border-green-300' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{slot.assignedGuard.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {slot.assignedGuard.badge_number}
                </div>
              </div>
              
              <div className="flex gap-2">
                {!slot.isPresent ? (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPresent(slot.assignedGuard!.id, slot.shiftType)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Mark Present
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAbsent(slot.assignedGuard!.id, slot.shiftType)}
                    disabled={isLoading}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    Mark Absent
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveGuard(slot.assignedGuard!.id, slot.shiftType)}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="text-muted-foreground text-sm">No guard assigned</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenSelection(slot.id, slot.shiftType)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Assign Guard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
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

  const daySlotData = slotsData.filter(slot => slot.shiftType === 'day');
  const nightSlotData = slotsData.filter(slot => slot.shiftType === 'night');

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Slot-Based Attendance Marking</CardTitle>
          <CardDescription>
            Allocate guards to specific slots based on staffing requirements and mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {selectedSiteData && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Staffing Requirements:</span>
                <span className="font-medium">
                  {daySlots} day slots, {nightSlots} night slots
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedSite ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No site selected</AlertTitle>
          <AlertDescription>
            Please select a site to view slots and mark attendance
          </AlertDescription>
        </Alert>
      ) : shiftsLoading ? (
        <div className="flex items-center justify-center h-64">Loading shifts...</div>
      ) : (
        <div className="space-y-6">
          {/* Day Shift Slots */}
          {daySlots > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Day Shift Slots ({daySlots})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {daySlotData.map(renderSlot)}
              </div>
            </div>
          )}

          {/* Night Shift Slots */}
          {nightSlots > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Night Shift Slots ({nightSlots})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nightSlotData.map(renderSlot)}
              </div>
            </div>
          )}

          {daySlots === 0 && nightSlots === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No slots configured</AlertTitle>
              <AlertDescription>
                This site has no staffing requirements configured. Please configure day and night slots in the site settings.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Guard Selection Modal */}
      <Dialog 
        open={selectionModal.isOpen} 
        onOpenChange={(open) => !open && setSelectionModal({ isOpen: false, slotId: '', shiftType: 'day' })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Guard to {selectionModal.shiftType === 'day' ? 'Day' : 'Night'} Shift
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {availableGuards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No available guards to assign</p>
                <p className="text-sm">All guards are already assigned to other slots or inactive</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {availableGuards.map((guard) => (
                  <div
                    key={guard.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleAssignGuard(guard.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {guard.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{guard.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {guard.badge_number}
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SlotBasedAttendanceMarking;