import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Info, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Users,
  UserCheck,
  UserX,
  Replace
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi, type Guard } from '@/lib/guardsApi';
import { shiftsApi } from '@/lib/shiftsApi';
import { attendanceApi } from '@/lib/attendanceApi';

interface QuickAttendanceMarkingProps {
  preselectedSiteId?: string;
}

interface SlotData {
  id: string;
  shiftType: 'day' | 'night';
  slotNumber: number;
  guard: {
    id: string;
    name: string;
    badge_number: string;
  } | null;
  isPresent: boolean;
  isSelected: boolean;
}

const QuickAttendanceMarking: React.FC<QuickAttendanceMarkingProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [replacementModal, setReplacementModal] = useState<{
    isOpen: boolean;
    slotId: string;
    currentGuardId: string;
  }>({ isOpen: false, slotId: '', currentGuardId: '' });
  const queryClient = useQueryClient();

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Fetch data
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesApi.getAllSites()
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: () => guardsApi.getAllGuards()
  });

  const { data: shifts = [] } = useQuery({
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
  const daySlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.day_slots, 0) || 0;
  const nightSlots = selectedSiteData?.staffing_requirements?.reduce((sum, req) => sum + req.night_slots, 0) || 0;

  // Auto-populate slots from shifts and attendance
  useEffect(() => {
    if (!selectedSite || !guards.length) return;

    const newSlots: SlotData[] = [];
    const dayShifts = shifts.filter(shift => shift.type === 'day');
    const nightShifts = shifts.filter(shift => shift.type === 'night');

    // Create day shift slots
    for (let i = 1; i <= daySlots; i++) {
      const shift = dayShifts[i - 1];
      const guard = shift ? guards.find(g => g.id === shift.guard_id) : null;
      const attendanceRecord = attendanceRecords.find(record => 
        record.employee_id === guard?.id && 
        record.shift_type === 'day' &&
        record.site_id === selectedSite &&
        record.status === 'present'
      );

      newSlots.push({
        id: `day-${i}`,
        shiftType: 'day',
        slotNumber: i,
        guard: guard ? {
          id: guard.id,
          name: guard.name,
          badge_number: guard.badge_number
        } : null,
        isPresent: !!attendanceRecord,
        isSelected: false
      });
    }

    // Create night shift slots
    for (let i = 1; i <= nightSlots; i++) {
      const shift = nightShifts[i - 1];
      const guard = shift ? guards.find(g => g.id === shift.guard_id) : null;
      const attendanceRecord = attendanceRecords.find(record => 
        record.employee_id === guard?.id && 
        record.shift_type === 'night' &&
        record.site_id === selectedSite &&
        record.status === 'present'
      );

      newSlots.push({
        id: `night-${i}`,
        shiftType: 'night',
        slotNumber: i,
        guard: guard ? {
          id: guard.id,
          name: guard.name,
          badge_number: guard.badge_number
        } : null,
        isPresent: !!attendanceRecord,
        isSelected: false
      });
    }

    setSlots(newSlots);
  }, [selectedSite, guards, shifts, attendanceRecords, daySlots, nightSlots]);

  // Available guards for replacement
  const availableGuards = useMemo(() => {
    const assignedGuardIds = slots
      .filter(slot => slot.guard)
      .map(slot => slot.guard!.id);
    
    return guards.filter(guard => 
      guard.status === 'active' && 
      !assignedGuardIds.includes(guard.id)
    );
  }, [guards, slots]);

  // Bulk attendance mutation
  const bulkAttendanceMutation = useMutation({
    mutationFn: async (updates: { guardId: string; shiftType: 'day' | 'night'; isPresent: boolean }[]) => {
      const promises = updates.map(async ({ guardId, shiftType, isPresent }) => {
        if (isPresent) {
          // Check if already marked elsewhere
          const isMarkedElsewhere = await attendanceApi.isGuardMarkedElsewhere(
            guardId, formattedDate, shiftType, selectedSite
          );
          if (isMarkedElsewhere) {
            throw new Error(`Guard ${guardId} is already marked at another site`);
          }

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
        } else {
          // Remove attendance record
          const record = attendanceRecords.find(r => 
            r.employee_id === guardId && 
            r.shift_type === shiftType &&
            r.site_id === selectedSite
          );
          if (record) {
            return attendanceApi.deleteAttendanceRecord(record.id);
          }
        }
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      toast.success('Attendance updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating attendance:', error);
      toast.error(error.message || 'Failed to update attendance');
    }
  });

  // Replace guard mutation
  const replaceGuardMutation = useMutation({
    mutationFn: async ({ slotId, newGuardId }: { slotId: string; newGuardId: string }) => {
      const slot = slots.find(s => s.id === slotId);
      if (!slot) throw new Error('Slot not found');

      const shiftType = slot.shiftType;
      const slotIndex = slot.slotNumber - 1;

      // Get existing shifts for this type
      const existingShifts = shifts.filter(shift => 
        shift.type === shiftType && shift.site_id === selectedSite
      );

      // Remove old shift if exists
      if (existingShifts[slotIndex]) {
        await shiftsApi.deleteShift(existingShifts[slotIndex].id);
      }

      // Create new shift
      return shiftsApi.createShift({
        site_id: selectedSite,
        guard_id: newGuardId,
        type: shiftType
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Guard replaced successfully');
      setReplacementModal({ isOpen: false, slotId: '', currentGuardId: '' });
    },
    onError: (error: any) => {
      console.error('Error replacing guard:', error);
      toast.error('Failed to replace guard');
    }
  });

  const handleSlotToggle = (slotId: string) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, isSelected: !slot.isSelected }
        : slot
    ));
  };

  const handleAttendanceToggle = (slotId: string) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, isPresent: !slot.isPresent }
        : slot
    ));
  };

  const handleBulkAction = (action: 'mark-present' | 'mark-absent' | 'select-all' | 'clear-selection') => {
    switch (action) {
      case 'select-all':
        setSlots(prev => prev.map(slot => ({ ...slot, isSelected: slot.guard !== null })));
        break;
      case 'clear-selection':
        setSlots(prev => prev.map(slot => ({ ...slot, isSelected: false })));
        break;
      case 'mark-present':
        setSlots(prev => prev.map(slot => 
          slot.isSelected && slot.guard 
            ? { ...slot, isPresent: true, isSelected: false }
            : slot
        ));
        break;
      case 'mark-absent':
        setSlots(prev => prev.map(slot => 
          slot.isSelected && slot.guard 
            ? { ...slot, isPresent: false, isSelected: false }
            : slot
        ));
        break;
    }
  };

  const handleSaveAttendance = async () => {
    const updates = slots
      .filter(slot => slot.guard)
      .map(slot => ({
        guardId: slot.guard!.id,
        shiftType: slot.shiftType,
        isPresent: slot.isPresent
      }));

    await bulkAttendanceMutation.mutateAsync(updates);
  };

  const handleCopyYesterday = async () => {
    if (!selectedSite) return;
    
    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
    
    try {
      const result = await attendanceApi.copyAttendanceFromDate(yesterday, formattedDate, selectedSite);
      if (result.copied > 0) {
        toast.success(`Copied ${result.copied} attendance records from yesterday`);
        queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      } else {
        toast.info('No attendance records found for yesterday at this site');
      }
    } catch (error) {
      console.error('Error copying yesterday\'s attendance:', error);
      toast.error('Failed to copy yesterday\'s attendance');
    }
  };

  const handleReplaceGuard = async (newGuardId: string) => {
    await replaceGuardMutation.mutateAsync({
      slotId: replacementModal.slotId,
      newGuardId
    });
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const selectedSlots = slots.filter(slot => slot.isSelected);
  const assignedSlots = slots.filter(slot => slot.guard);
  const presentCount = slots.filter(slot => slot.isPresent).length;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Attendance Marking</CardTitle>
          <CardDescription>
            Review and mark attendance for all slots quickly. Guards are auto-populated from shift assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyYesterday}
                disabled={!selectedSite}
                className="w-full"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Yesterday
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {selectedSite && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{assignedSlots.length}</div>
                <div className="text-sm text-muted-foreground">Assigned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{assignedSlots.length - presentCount}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedSlots.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
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
            Please select a site to view and mark attendance
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('select-all')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('clear-selection')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear Selection
                </Button>
                
                <Button 
                  size="sm"
                  onClick={() => handleBulkAction('mark-present')}
                  disabled={selectedSlots.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Mark Selected Present ({selectedSlots.length})
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('mark-absent')}
                  disabled={selectedSlots.length === 0}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Mark Selected Absent ({selectedSlots.length})
                </Button>

                <Button 
                  onClick={handleSaveAttendance}
                  disabled={bulkAttendanceMutation.isPending}
                  className="ml-auto"
                >
                  {bulkAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slots Grid */}
          <div className="space-y-6">
            {/* Day Shift */}
            {daySlots > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Day Shift ({daySlots} slots)</CardTitle>
                  <CardDescription>8:00 AM - 8:00 PM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {slots.filter(slot => slot.shiftType === 'day').map(slot => (
                      <div
                        key={slot.id}
                        className={`relative p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          slot.isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : slot.isPresent 
                            ? 'border-green-300 bg-green-50' 
                            : slot.guard 
                            ? 'border-gray-300 hover:border-gray-400' 
                            : 'border-dashed border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {slot.guard && (
                              <Checkbox
                                checked={slot.isSelected}
                                onCheckedChange={() => handleSlotToggle(slot.id)}
                              />
                            )}
                            <span className="text-sm font-medium">Slot {slot.slotNumber}</span>
                          </div>
                          {slot.isPresent && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              Present
                            </Badge>
                          )}
                        </div>

                        {slot.guard ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {slot.guard.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{slot.guard.name}</div>
                                <div className="text-xs text-muted-foreground">{slot.guard.badge_number}</div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={slot.isPresent ? "default" : "outline"}
                                onClick={() => handleAttendanceToggle(slot.id)}
                                className="flex-1"
                              >
                                {slot.isPresent ? 'Present' : 'Mark Present'}
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setReplacementModal({
                                      isOpen: true,
                                      slotId: slot.id,
                                      currentGuardId: slot.guard.id
                                    })}
                                  >
                                    <Replace className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Replace Guard</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="p-3 bg-muted rounded-lg">
                                      <div className="text-sm font-medium">Current: {slot.guard.name}</div>
                                      <div className="text-xs text-muted-foreground">{slot.guard.badge_number}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Select Replacement</Label>
                                      <div className="max-h-60 overflow-y-auto space-y-2">
                                        {availableGuards.map(guard => (
                                          <div
                                            key={guard.id}
                                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleReplaceGuard(guard.id)}
                                          >
                                            <div>
                                              <div className="font-medium">{guard.name}</div>
                                              <div className="text-sm text-muted-foreground">{guard.badge_number}</div>
                                            </div>
                                            <Button size="sm">Select</Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No guard assigned</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Night Shift */}
            {nightSlots > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Night Shift ({nightSlots} slots)</CardTitle>
                  <CardDescription>8:00 PM - 8:00 AM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {slots.filter(slot => slot.shiftType === 'night').map(slot => (
                      <div
                        key={slot.id}
                        className={`relative p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          slot.isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : slot.isPresent 
                            ? 'border-green-300 bg-green-50' 
                            : slot.guard 
                            ? 'border-gray-300 hover:border-gray-400' 
                            : 'border-dashed border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {slot.guard && (
                              <Checkbox
                                checked={slot.isSelected}
                                onCheckedChange={() => handleSlotToggle(slot.id)}
                              />
                            )}
                            <span className="text-sm font-medium">Slot {slot.slotNumber}</span>
                          </div>
                          {slot.isPresent && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              Present
                            </Badge>
                          )}
                        </div>

                        {slot.guard ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {slot.guard.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{slot.guard.name}</div>
                                <div className="text-xs text-muted-foreground">{slot.guard.badge_number}</div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={slot.isPresent ? "default" : "outline"}
                                onClick={() => handleAttendanceToggle(slot.id)}
                                className="flex-1"
                              >
                                {slot.isPresent ? 'Present' : 'Mark Present'}
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setReplacementModal({
                                      isOpen: true,
                                      slotId: slot.id,
                                      currentGuardId: slot.guard.id
                                    })}
                                  >
                                    <Replace className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Replace Guard</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="p-3 bg-muted rounded-lg">
                                      <div className="text-sm font-medium">Current: {slot.guard.name}</div>
                                      <div className="text-xs text-muted-foreground">{slot.guard.badge_number}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Select Replacement</Label>
                                      <div className="max-h-60 overflow-y-auto space-y-2">
                                        {availableGuards.map(guard => (
                                          <div
                                            key={guard.id}
                                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleReplaceGuard(guard.id)}
                                          >
                                            <div>
                                              <div className="font-medium">{guard.name}</div>
                                              <div className="text-sm text-muted-foreground">{guard.badge_number}</div>
                                            </div>
                                            <Button size="sm">Select</Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">No guard assigned</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QuickAttendanceMarking;