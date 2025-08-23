import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Clock, UserPlus, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi } from '@/lib/guardsApi';
import { dailyAttendanceSlotsApi, DailyAttendanceSlot } from '@/lib/dailyAttendanceSlotsApi';
import SimpleGuardSelectionModal from './SimpleGuardSelectionModal';

interface SlotBasedAttendanceMarkingProps {
  preselectedSiteId?: string;
}

const SlotBasedAttendanceMarking: React.FC<SlotBasedAttendanceMarkingProps> = ({
  preselectedSiteId
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [allocationModal, setAllocationModal] = useState<{
    isOpen: boolean;
    slotId: string;
    shiftType: 'day' | 'night';
    roleType: string;
    isReplacement?: boolean;
    originalGuardId?: string;
  }>({ isOpen: false, slotId: '', shiftType: 'day', roleType: '', isReplacement: false });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set preselected site
  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Fetch sites
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites
  });

  // Fetch guards
  const { data: guards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: guardsApi.getAllGuards
  });

  // Generate/fetch slots for selected date and site
  const { data: slots = [], isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['daily-slots', selectedSite, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => {
      if (!selectedSite) return [];
      return dailyAttendanceSlotsApi.generateSlotsForDate(
        selectedSite,
        format(selectedDate, 'yyyy-MM-dd')
      );
    },
    enabled: !!selectedSite
  });

  // Group slots by shift type and role
  const groupedSlots = React.useMemo(() => {
    const grouped: Record<string, Record<string, DailyAttendanceSlot[]>> = {
      day: {},
      night: {}
    };

    slots.forEach(slot => {
      if (!grouped[slot.shift_type][slot.role_type]) {
        grouped[slot.shift_type][slot.role_type] = [];
      }
      grouped[slot.shift_type][slot.role_type].push(slot);
    });

    return grouped;
  }, [slots]);

  // Assign guard mutation
  const assignGuardMutation = useMutation({
    mutationFn: ({ slotId, guardId }: { slotId: string; guardId: string }) =>
      dailyAttendanceSlotsApi.assignGuardToSlot(slotId, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Guard assigned successfully' });
      setAllocationModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      toast({
        title: 'Error assigning guard',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Unassign guard mutation
  const unassignGuardMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.unassignGuardFromSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Guard unassigned successfully' });
    }
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: ({ slotId, isPresent }: { slotId: string; isPresent: boolean }) =>
      dailyAttendanceSlotsApi.markAttendance(slotId, isPresent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Attendance marked successfully' });
    }
  });

  // Copy from previous day mutation
  const copyPreviousDayMutation = useMutation({
    mutationFn: () => {
      const currentDate = format(selectedDate, 'yyyy-MM-dd');
      const previousDate = format(
        new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );
      return dailyAttendanceSlotsApi.copySlotsFromPreviousDay(
        selectedSite,
        currentDate,
        previousDate
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Slots copied from previous day successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error copying slots',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleOpenAllocation = (slotId: string, shiftType: 'day' | 'night', roleType: string, isReplacement = false, originalGuardId?: string) => {
    setAllocationModal({
      isOpen: true,
      slotId,
      shiftType,
      roleType,
      isReplacement,
      originalGuardId
    });
  };

  const handleGuardAssignment = (guardId: string) => {
    if (allocationModal.slotId) {
      assignGuardMutation.mutate({
        slotId: allocationModal.slotId,
        guardId
      });
    }
  };

  const handleUnassignGuard = (slotId: string) => {
    unassignGuardMutation.mutate(slotId);
  };

  const handleReplaceGuard = (slotId: string, shiftType: 'day' | 'night', roleType: string, originalGuardId: string) => {
    handleOpenAllocation(slotId, shiftType, roleType, true, originalGuardId);
  };

  const handleMarkAttendance = (slotId: string, isPresent: boolean) => {
    markAttendanceMutation.mutate({ slotId, isPresent });
  };

  const handleCopyPreviousDay = () => {
    copyPreviousDayMutation.mutate();
  };

  // Filter available guards for replacement (exclude already assigned guards for same shift)
  const getAvailableGuardsForSlot = (currentSlotId: string, shiftType: 'day' | 'night') => {
    const assignedGuardIds = slots
      .filter(slot => slot.shift_type === shiftType && slot.id !== currentSlotId && slot.assigned_guard_id)
      .map(slot => slot.assigned_guard_id);
    
    return guards.filter(guard => 
      guard.status === 'active' && 
      !assignedGuardIds.includes(guard.id)
    );
  };

  const renderSlotCard = (slot: DailyAttendanceSlot) => {
    const assignedGuard = guards.find(g => g.id === slot.assigned_guard_id);
    const isAbsent = slot.is_present === false;
    const isPresent = slot.is_present === true;
    
    return (
      <Card key={slot.id} className={`border-border ${isAbsent ? 'border-red-200 bg-red-50/50' : isPresent ? 'border-green-200 bg-green-50/50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Slot {slot.slot_number}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {slot.role_type}
              </Badge>
              {isAbsent && (
                <Badge variant="destructive" className="text-xs">
                  Absent
                </Badge>
              )}
              {isPresent && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-300">
                  Present
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedGuard ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{assignedGuard.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Badge: {assignedGuard.badge_number}
                  </p>
                </div>
                {!isAbsent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnassignGuard(slot.id)}
                    className="text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              {isAbsent ? (
                <div className="space-y-2">
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    This guard is marked absent. You can replace them with another guard.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReplaceGuard(slot.id, slot.shift_type, slot.role_type, assignedGuard.id)}
                      className="flex-1 text-xs"
                    >
                      Replace Guard
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAttendance(slot.id, true)}
                      className="flex-1 text-xs"
                      disabled={markAttendanceMutation.isPending}
                    >
                      Mark Present
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isPresent ? "default" : "outline"}
                    onClick={() => handleMarkAttendance(slot.id, true)}
                    className="flex-1 text-xs"
                    disabled={markAttendanceMutation.isPending}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant={isAbsent ? "destructive" : "outline"}
                    onClick={() => handleMarkAttendance(slot.id, false)}
                    className="flex-1 text-xs"
                    disabled={markAttendanceMutation.isPending}
                  >
                    Absent
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAllocation(slot.id, slot.shift_type, slot.role_type)}
              className="w-full text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Assign Guard
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderShiftSection = (shiftType: 'day' | 'night', shiftSlots: Record<string, DailyAttendanceSlot[]>) => {
    const shiftTitle = shiftType === 'day' ? 'Day Shift' : 'Night Shift';
    const shiftIcon = shiftType === 'day' ? '☀️' : '🌙';
    
    return (
      <Card key={shiftType} className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{shiftIcon}</span>
            {shiftTitle}
            <Badge variant="secondary" className="ml-auto">
              {Object.values(shiftSlots).flat().length} slots
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(shiftSlots).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No slots available for {shiftTitle.toLowerCase()}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(shiftSlots).map(([roleType, roleSlots]) => (
                <div key={roleType}>
                  <h4 className="font-medium text-sm mb-3 text-foreground">
                    {roleType} ({roleSlots.length} slots)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roleSlots.map(renderSlotCard)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Slot-Based Attendance</h1>
          <p className="text-muted-foreground">
            Manage daily attendance slots based on site requirements
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPreviousDay}
            disabled={!selectedSite || copyPreviousDayMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Yesterday
          </Button>
        </div>
      </div>

      {/* Date and Site Selection */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date & Site
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Site</label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {site.site_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Slots */}
      {selectedSite && (
        <div className="space-y-6">
          {slotsLoading ? (
            <Card className="border-border">
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading attendance slots...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {renderShiftSection('day', groupedSlots.day)}
              {renderShiftSection('night', groupedSlots.night)}
            </>
          )}
        </div>
      )}

      {/* Guard Selection Modal */}
      <SimpleGuardSelectionModal
        isOpen={allocationModal.isOpen}
        onClose={() => setAllocationModal(prev => ({ ...prev, isOpen: false }))}
        guards={allocationModal.isReplacement ? 
          getAvailableGuardsForSlot(allocationModal.slotId, allocationModal.shiftType) : 
          guards}
        onGuardSelect={handleGuardAssignment}
        title={allocationModal.isReplacement ? 
          `Replace Guard - ${allocationModal.shiftType} shift (${allocationModal.roleType})` :
          `Assign Guard - ${allocationModal.shiftType} shift (${allocationModal.roleType})`}
      />
    </div>
  );
};

export default SlotBasedAttendanceMarking;