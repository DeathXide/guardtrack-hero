import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Info, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Users,
  UserCheck,
  UserPlus,
  Replace,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  isPendingSave: boolean;
}

type FilterType = 'all' | 'present' | 'unmarked' | 'empty';

const QuickAttendanceMarking: React.FC<QuickAttendanceMarkingProps> = ({ preselectedSiteId }) => {
  console.log('QuickAttendanceMarking component initializing');
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [guardSearchQuery, setGuardSearchQuery] = useState<string>('');
  const [replacementModal, setReplacementModal] = useState<{
    isOpen: boolean;
    slotId: string;
    currentGuardId: string;
    mode: 'assign' | 'replace';
  }>({ isOpen: false, slotId: '', currentGuardId: '', mode: 'assign' });
  const queryClient = useQueryClient();

  console.log('slots state initialized:', slots);
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Auto-save functionality
  const autoSaveMutation = useMutation({
    mutationFn: async ({ guardId, shiftType, isPresent }: { guardId: string; shiftType: 'day' | 'night'; isPresent: boolean }) => {
      if (isPresent) {
        // Check if already marked elsewhere
        const isMarkedElsewhere = await attendanceApi.isGuardMarkedElsewhere(
          guardId, formattedDate, shiftType, selectedSite
        );
        if (isMarkedElsewhere) {
          const guard = guards.find(g => g.id === guardId);
          const guardName = guard ? guard.name : 'Unknown Guard';
          throw new Error(`${guardName} is already marked at another site`);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
    },
    onError: (error: any) => {
      console.error('Error auto-saving attendance:', error);
      toast.error(error.message || 'Failed to save attendance');
    },
    onSettled: (_, __, { guardId, shiftType }) => {
      // Clear pending state
      setSlots(prev => prev.map(slot => 
        slot.guard?.id === guardId && slot.shiftType === shiftType 
          ? { ...slot, isPendingSave: false }
          : slot
      ));
    }
  });

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
        isPendingSave: false
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
        isPendingSave: false
      });
    }

    setSlots(newSlots);
  }, [selectedSite, guards, shifts, attendanceRecords, daySlots, nightSlots]);

  // Available guards for replacement
  const availableGuards = useMemo(() => {
    const assignedGuardIds = slots
      .filter(slot => slot.guard)
      .map(slot => slot.guard!.id);
    
    // Guards who are currently marked present
    const presentGuardIds = slots
      .filter(slot => slot.guard && slot.isPresent)
      .map(slot => slot.guard!.id);
    
    return guards.filter(guard => 
      guard.status === 'active' && 
      !assignedGuardIds.includes(guard.id) &&
      !presentGuardIds.includes(guard.id)
    );
  }, [guards, slots]);

  // Filtered slots based on current filter
  const filteredSlots = useMemo(() => {
    switch (filter) {
      case 'present':
        return slots.filter(slot => slot.isPresent);
      case 'unmarked':
        return slots.filter(slot => slot.guard && !slot.isPresent);
      case 'empty':
        return slots.filter(slot => !slot.guard);
      default:
        return slots;
    }
  }, [slots, filter]);

  const handleAttendanceToggle = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot?.guard) return;

    // Check for conflicts
    if (!slot.isPresent) {
      const isMarkedElsewhereLocally = slots.some(s => 
        s.id !== slotId && 
        s.guard?.id === slot.guard.id && 
        s.isPresent
      );

      if (isMarkedElsewhereLocally) {
        toast.error(`${slot.guard.name} is already marked present at another shift`);
        return;
      }
    }

    // Update local state immediately
    setSlots(prev => prev.map(s => 
      s.id === slotId 
        ? { ...s, isPresent: !s.isPresent, isPendingSave: true }
        : s
    ));

    // Auto-save
    autoSaveMutation.mutate({
      guardId: slot.guard.id,
      shiftType: slot.shiftType,
      isPresent: !slot.isPresent
    });
  };

  const handleBulkMarkPresent = () => {
    const unmarkedSlots = slots.filter(slot => slot.guard && !slot.isPresent);
    
    if (unmarkedSlots.length === 0) {
      toast.info('All guards are already marked present');
      return;
    }

    const conflictingGuards: string[] = [];
    
    unmarkedSlots.forEach(slot => {
      if (slot.guard) {
        // Check if this guard is already marked present elsewhere
        const isMarkedElsewhere = slots.some(s => 
          s.id !== slot.id && 
          s.guard?.id === slot.guard.id && 
          s.isPresent
        );
        
        if (!isMarkedElsewhere) {
          // Mark present and auto-save
          setSlots(prev => prev.map(s => 
            s.id === slot.id 
              ? { ...s, isPresent: true, isPendingSave: true }
              : s
          ));
          
          autoSaveMutation.mutate({
            guardId: slot.guard.id,
            shiftType: slot.shiftType,
            isPresent: true
          });
        } else {
          conflictingGuards.push(slot.guard.name);
        }
      }
    });
    
    if (conflictingGuards.length > 0) {
      toast.error(`Cannot mark present: ${conflictingGuards.join(', ')} already marked at other shifts`);
    }
    
    const markedCount = unmarkedSlots.length - conflictingGuards.length;
    if (markedCount > 0) {
      toast.success(`Marked ${markedCount} guards present`);
    }
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

  // Assign/Replace guard mutation
  const assignGuardMutation = useMutation({
    mutationFn: async (newGuardId: string) => {
      const slot = slots.find(s => s.id === replacementModal.slotId);
      if (!slot) throw new Error('Slot not found');

      const shiftType = slot.shiftType;
      const slotIndex = slot.slotNumber - 1;

      // Get existing shifts for this type
      const existingShifts = shifts.filter(shift => 
        shift.type === shiftType && shift.site_id === selectedSite
      );

      // Remove old shift if exists (for replacement mode)
      if (replacementModal.mode === 'replace' && existingShifts[slotIndex]) {
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
      toast.success(replacementModal.mode === 'assign' ? 'Guard assigned successfully' : 'Guard replaced successfully');
      setReplacementModal({ isOpen: false, slotId: '', currentGuardId: '', mode: 'assign' });
    },
    onError: (error: any) => {
      console.error('Error with guard assignment:', error);
      toast.error('Failed to assign guard');
    }
  });

  const handleOpenAssignModal = (slotId: string, mode: 'assign' | 'replace', currentGuardId: string = '') => {
    setReplacementModal({
      isOpen: true,
      slotId,
      currentGuardId,
      mode
    });
  };

  const handleConfirmAssignment = async (newGuardId: string) => {
    await assignGuardMutation.mutateAsync(newGuardId);
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const presentCount = slots.filter(slot => slot.isPresent).length;
  const assignedSlots = slots.filter(slot => slot.guard);
  const emptySlots = slots.filter(slot => !slot.guard).length;
  const unmarkedCount = slots.filter(slot => slot.guard && !slot.isPresent).length;

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Smart Attendance</CardTitle>
              <CardDescription>One-click marking • Auto-save • Smart conflicts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Quick Actions
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {format(selectedDate, 'MMM dd')}
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

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select site" />
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

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filter</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Filter className="mr-2 h-3 w-3" />
                    {filter === 'all' ? 'All Slots' : 
                     filter === 'present' ? 'Present' :
                     filter === 'unmarked' ? 'Unmarked' : 'Empty'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilter('all')}>All Slots</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('present')}>Present Only</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('unmarked')}>Unmarked Only</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('empty')}>Empty Slots</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Actions</Label>
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

          {/* Quick Stats */}
          {selectedSite && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{presentCount}</span>
                  <span className="text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-medium">{unmarkedCount}</span>
                  <span className="text-muted-foreground">Unmarked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="font-medium">{emptySlots}</span>
                  <span className="text-muted-foreground">Empty</span>
                </div>
              </div>
              {showBulkActions && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleBulkMarkPresent}
                    disabled={unmarkedCount === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Mark All Present ({unmarkedCount})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedSite ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Select a site to start</AlertTitle>
          <AlertDescription>Choose a site from the dropdown above to view and mark attendance</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* Day Shift */}
          {daySlots > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Day Shift</CardTitle>
                    <CardDescription>8:00 AM - 8:00 PM • {filteredSlots.filter(s => s.shiftType === 'day').length} slots</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredSlots.filter(slot => slot.shiftType === 'day').map(slot => (
                    <SlotCard 
                      key={slot.id}
                      slot={slot}
                      onAttendanceToggle={handleAttendanceToggle}
                      onOpenAssignModal={handleOpenAssignModal}
                      isConflicted={!slot.isPresent && slots.some(s => 
                        s.id !== slot.id && 
                        s.guard?.id === slot.guard?.id && 
                        s.isPresent
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Night Shift */}
          {nightSlots > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Night Shift</CardTitle>
                    <CardDescription>8:00 PM - 8:00 AM • {filteredSlots.filter(s => s.shiftType === 'night').length} slots</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredSlots.filter(slot => slot.shiftType === 'night').map(slot => (
                    <SlotCard 
                      key={slot.id}
                      slot={slot}
                      onAttendanceToggle={handleAttendanceToggle}
                      onOpenAssignModal={handleOpenAssignModal}
                      isConflicted={!slot.isPresent && slots.some(s => 
                        s.id !== slot.id && 
                        s.guard?.id === slot.guard?.id && 
                        s.isPresent
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Guard Assignment Modal */}
      <Dialog 
        open={replacementModal.isOpen} 
        onOpenChange={(open) => !open && setReplacementModal({ isOpen: false, slotId: '', currentGuardId: '', mode: 'assign' })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {replacementModal.mode === 'assign' ? 'Assign Guard to Slot' : 'Replace Guard'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {replacementModal.mode === 'replace' && replacementModal.currentGuardId && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">
                  Current: {guards.find(g => g.id === replacementModal.currentGuardId)?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {guards.find(g => g.id === replacementModal.currentGuardId)?.badge_number}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>
                {replacementModal.mode === 'assign' ? 'Select Guard to Assign' : 'Select Replacement Guard'}
              </Label>
              
              <Input
                placeholder="Search guards by name or badge number..."
                value={guardSearchQuery}
                onChange={(e) => setGuardSearchQuery(e.target.value)}
                className="mb-2"
              />
              
              {availableGuards.filter(guard => 
                guard.name.toLowerCase().includes(guardSearchQuery.toLowerCase()) ||
                guard.badge_number.toLowerCase().includes(guardSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{guardSearchQuery ? 'No guards found' : 'No available guards'}</p>
                  <p className="text-sm">{guardSearchQuery ? 'Try a different search term' : 'All guards are already assigned or inactive'}</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableGuards.filter(guard => 
                    guard.name.toLowerCase().includes(guardSearchQuery.toLowerCase()) ||
                    guard.badge_number.toLowerCase().includes(guardSearchQuery.toLowerCase())
                  ).map(guard => (
                    <div
                      key={guard.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleConfirmAssignment(guard.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {guard.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{guard.name}</div>
                          <div className="text-sm text-muted-foreground">{guard.badge_number}</div>
                        </div>
                      </div>
                      <Button size="sm" disabled={assignGuardMutation.isPending}>
                        {assignGuardMutation.isPending ? 'Assigning...' : 'Select'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Optimized Slot Card Component
interface SlotCardProps {
  slot: SlotData;
  onAttendanceToggle: (slotId: string) => void;
  onOpenAssignModal: (slotId: string, mode: 'assign' | 'replace', currentGuardId?: string) => void;
  isConflicted: boolean;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onAttendanceToggle, onOpenAssignModal, isConflicted }) => {
  if (!slot.guard) {
    return (
      <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
        <div className="text-center space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Slot {slot.slotNumber}</div>
          <Users className="h-6 w-6 mx-auto opacity-50 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">Empty</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenAssignModal(slot.id, 'assign')}
            className="w-full h-7 text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative p-3 border-2 rounded-lg transition-all cursor-pointer ${
        slot.isPendingSave 
          ? 'border-blue-300 bg-blue-50 animate-pulse' 
          : slot.isPresent 
          ? 'border-green-300 bg-green-50 hover:bg-green-100' 
          : isConflicted
          ? 'border-red-300 bg-red-50'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
      onClick={() => !isConflicted && onAttendanceToggle(slot.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">Slot {slot.slotNumber}</div>
        <div className="flex items-center gap-1">
          {slot.isPendingSave && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
          {slot.isPresent && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 text-xs px-1.5 py-0">
              ✓
            </Badge>
          )}
        </div>
      </div>

      {/* Guard Info */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">
            {slot.guard.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{slot.guard.name}</div>
          <div className="text-xs text-muted-foreground">{slot.guard.badge_number}</div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={slot.isPresent ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            if (!isConflicted) onAttendanceToggle(slot.id);
          }}
          className={`flex-1 h-7 text-xs ${
            slot.isPresent 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : isConflicted
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
          disabled={isConflicted}
        >
          {isConflicted ? (
            'Unavailable'
          ) : slot.isPresent ? (
            'Present ✓'
          ) : (
            'Mark Present'
          )}
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAssignModal(slot.id, 'replace', slot.guard.id);
          }}
          className="h-7 w-7 p-0"
          title="Replace guard"
        >
          <Replace className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default QuickAttendanceMarking;
