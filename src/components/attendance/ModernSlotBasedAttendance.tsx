import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, MapPin, AlertCircle, Sun, Moon, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi } from '@/lib/guardsApi';
import { dailyAttendanceSlotsApi, DailyAttendanceSlot } from '@/lib/dailyAttendanceSlotsApi';
import AttendanceStatsCards from './AttendanceStatsCards';
import ModernSlotCard from './ModernSlotCard';
import FloatingActionToolbar from './FloatingActionToolbar';
import EnhancedGuardSelectionModal from './EnhancedGuardSelectionModal';
import TemporarySlotsManagementDialog from './TemporarySlotsManagementDialog';

interface ModernSlotBasedAttendanceProps {
  preselectedSiteId?: string;
}

const ModernSlotBasedAttendance: React.FC<ModernSlotBasedAttendanceProps> = ({
  preselectedSiteId
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeShift, setActiveShift] = useState<'all' | 'day' | 'night'>('all');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  
  const [allocationModal, setAllocationModal] = useState<{
    isOpen: boolean;
    slotId: string;
    shiftType: 'day' | 'night';
    roleType: string;
    isReplacement?: boolean;
    originalGuardId?: string;
  }>({ isOpen: false, slotId: '', shiftType: 'day', roleType: '', isReplacement: false });
  
  const [temporarySlotsDialog, setTemporarySlotsDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set preselected site
  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  // Fetch data
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites
  });

  const { data: guards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: guardsApi.getAllGuards
  });

  const { data: slots = [], isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['daily-slots', selectedSite, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => {
      if (!selectedSite) return [];
      return dailyAttendanceSlotsApi.generateSlotsForDate(
        selectedSite,
        format(selectedDate, 'yyyy-MM-dd')
      );
    },
    enabled: !!selectedSite,
    staleTime: 0,
    gcTime: 5 * 60 * 1000
  });

  const { data: temporarySlots = [] } = useQuery({
    queryKey: ['temporary-slots', selectedSite, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => {
      if (!selectedSite) return [];
      return dailyAttendanceSlotsApi.getTemporarySlots(
        selectedSite,
        format(selectedDate, 'yyyy-MM-dd')
      );
    },
    enabled: !!selectedSite
  });

  // Process and filter slots
  const { filteredSlots, uniqueRoles, shiftCounts } = useMemo(() => {
    let filtered = slots;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(slot => {
        const assignedGuard = guards.find(g => g.id === slot.assigned_guard_id);
        return (
          slot.role_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.slot_number.toString().includes(searchTerm) ||
          (assignedGuard && assignedGuard.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (assignedGuard && assignedGuard.badge_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(slot => slot.role_type === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(slot => {
        switch (statusFilter) {
          case 'assigned':
            return slot.assigned_guard_id && slot.is_present === null;
          case 'present':
            return slot.is_present === true;
          case 'absent':
            return slot.is_present === false;
          case 'empty':
            return !slot.assigned_guard_id;
          default:
            return true;
        }
      });
    }

    // Apply shift filter
    if (activeShift !== 'all') {
      filtered = filtered.filter(slot => slot.shift_type === activeShift);
    }

    // Get unique roles for filter dropdown
    const roles = new Set(slots.map(slot => slot.role_type));
    
    // Count slots by shift
    const counts = {
      day: slots.filter(slot => slot.shift_type === 'day').length,
      night: slots.filter(slot => slot.shift_type === 'night').length,
      all: slots.length
    };

    return {
      filteredSlots: filtered,
      uniqueRoles: Array.from(roles) as string[],
      shiftCounts: counts
    };
  }, [slots, guards, searchTerm, roleFilter, statusFilter, activeShift]);

  // Group slots by shift type and role
  const groupedSlots = useMemo(() => {
    const grouped: Record<string, Record<string, DailyAttendanceSlot[]>> = {
      day: {},
      night: {}
    };

    filteredSlots.forEach(slot => {
      if (!grouped[slot.shift_type][slot.role_type]) {
        grouped[slot.shift_type][slot.role_type] = [];
      }
      grouped[slot.shift_type][slot.role_type].push(slot);
    });

    return grouped;
  }, [filteredSlots]);

  // Mutations
  const assignGuardMutation = useMutation({
    mutationFn: ({ slotId, guardId }: { slotId: string; guardId: string }) =>
      dailyAttendanceSlotsApi.assignGuardToSlot(slotId, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
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

  const unassignGuardMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.unassignGuardFromSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: 'Guard unassigned successfully' });
    }
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ slotId, isPresent }: { slotId: string; isPresent: boolean }) =>
      dailyAttendanceSlotsApi.markAttendance(slotId, isPresent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Attendance marked successfully' });
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ 
        title: 'Slots copied from previous day successfully', 
        description: 'Assigned guards marked as present automatically' 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error copying slots',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const regenerateSlotsMutation = useMutation({
    mutationFn: () => {
      if (!selectedSite) throw new Error('No site selected');
      return dailyAttendanceSlotsApi.regenerateSlotsForDate(
        selectedSite,
        format(selectedDate, 'yyyy-MM-dd')
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ 
        title: 'Slots regenerated successfully', 
        description: 'Updated slots based on current site requirements' 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error regenerating slots',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const markAllAttendanceMutation = useMutation({
    mutationFn: async () => {
      const assignedSlots = slots.filter(slot => slot.assigned_guard_id && slot.is_present === null);
      
      if (assignedSlots.length === 0) {
        throw new Error('No assigned guards without attendance records found');
      }

      // Mark all assigned guards as present
      const promises = assignedSlots.map(slot => 
        dailyAttendanceSlotsApi.markAttendance(slot.id, true)
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ 
        title: 'All attendance marked successfully',
        description: 'All assigned guards have been marked as present'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error marking attendance',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Event handlers
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

  const getAvailableGuardsForSlot = (currentSlotId: string, shiftType: 'day' | 'night') => {
    const assignedGuardIds = slots
      .filter(slot => slot.shift_type === shiftType && slot.id !== currentSlotId && slot.assigned_guard_id)
      .map(slot => slot.assigned_guard_id);
    
    return guards.filter(guard => 
      guard.status === 'active' && 
      !assignedGuardIds.includes(guard.id)
    );
  };

  // Check if all guards are assigned (all slots have guards and no attendance marked yet)
  const allGuardsAssigned = useMemo(() => {
    if (slots.length === 0) return false;
    const assignedSlots = slots.filter(slot => slot.assigned_guard_id);
    const unattendedSlots = slots.filter(slot => slot.assigned_guard_id && slot.is_present === null);
    return assignedSlots.length === slots.length && unattendedSlots.length > 0;
  }, [slots]);

  const renderShiftSection = (shiftType: 'day' | 'night') => {
    const shiftSlots = groupedSlots[shiftType];
    const shiftTitle = shiftType === 'day' ? 'Day Shift' : 'Night Shift';
    const ShiftIcon = shiftType === 'day' ? Sun : Moon;
    const totalSlotsInShift = Object.values(shiftSlots).flat().length;

    if (totalSlotsInShift === 0) return null;

    return (
      <div key={shiftType} className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
          <div className={`p-2 rounded-lg ${
            shiftType === 'day' 
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/20' 
              : 'bg-blue-100 text-blue-600 dark:bg-blue-950/20'
          }`}>
            <ShiftIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{shiftTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {totalSlotsInShift} slot{totalSlotsInShift !== 1 ? 's' : ''} available
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {totalSlotsInShift}
          </Badge>
        </div>

        {Object.entries(shiftSlots).map(([roleType, roleSlots]) => (
          <div key={`${shiftType}-${roleType}`} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                {roleType}
                <Badge variant="outline" className="text-xs">
                  {roleSlots.length}
                </Badge>
              </h4>
            </div>
            <div className="attendance-grid">
              {roleSlots.map(slot => {
                const assignedGuard = guards.find(g => g.id === slot.assigned_guard_id);
                return (
                  <ModernSlotCard
                    key={slot.id}
                    slot={slot}
                    assignedGuard={assignedGuard}
                    onAssignGuard={handleOpenAllocation}
                    onUnassignGuard={(slotId) => unassignGuardMutation.mutate(slotId)}
                    onReplaceGuard={(slotId, shiftType, roleType, originalGuardId) => 
                      handleOpenAllocation(slotId, shiftType, roleType, true, originalGuardId)
                    }
                    onMarkAttendance={(slotId, isPresent) => 
                      markAttendanceMutation.mutate({ slotId, isPresent })
                    }
                    isLoading={assignGuardMutation.isPending || unassignGuardMutation.isPending || markAttendanceMutation.isPending}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Slot-Based Attendance
            </h1>
            <p className="text-muted-foreground">
              Modern attendance management with enhanced user experience
            </p>
          </div>
          
          {/* Date and Site Selection */}
          <Card className="glass-card w-full lg:w-auto">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal min-w-[180px]">
                        <Calendar className="mr-2 h-4 w-4" />
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
                
                <div className="space-y-3 flex-1 sm:min-w-[220px]">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Site
                  </label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="min-w-[220px]">
                      <MapPin className="mr-2 h-4 w-4" />
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
            </CardContent>
          </Card>
        </div>

        {selectedSite && (
          <>
            {/* Stats Cards */}
            <AttendanceStatsCards slots={slots} />

            {/* Filters and Search */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search slots, guards, or roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="empty">Empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            {slotsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-10 bg-muted rounded"></div>
                        <div className="h-8 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : slots.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="py-8">
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">No slots found for this date</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        This might happen if the site's staffing requirements were recently updated. 
                        Click "Refresh Slots" to generate slots based on current requirements.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeShift} onValueChange={(value) => setActiveShift(value as 'all' | 'day' | 'night')} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="all" className="text-sm">
                    All ({shiftCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="day" className="text-sm">
                    <Sun className="h-4 w-4 mr-1" />
                    Day ({shiftCounts.day})
                  </TabsTrigger>
                  <TabsTrigger value="night" className="text-sm">
                    <Moon className="h-4 w-4 mr-1" />
                    Night ({shiftCounts.night})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                  {renderShiftSection('day')}
                  {renderShiftSection('night')}
                </TabsContent>

                <TabsContent value="day" className="space-y-8">
                  {renderShiftSection('day')}
                </TabsContent>

                <TabsContent value="night" className="space-y-8">
                  {renderShiftSection('night')}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {/* Floating Action Toolbar */}
        {selectedSite && (
          <FloatingActionToolbar
            onCopyPreviousDay={() => copyPreviousDayMutation.mutate()}
            onRegenerateSlots={() => regenerateSlotsMutation.mutate()}
            onOpenTemporarySlots={() => setTemporarySlotsDialog(true)}
            onMarkAllAttendance={() => markAllAttendanceMutation.mutate()}
            allGuardsAssigned={allGuardsAssigned}
            isLoading={{
              copy: copyPreviousDayMutation.isPending,
              regenerate: regenerateSlotsMutation.isPending,
              markAll: markAllAttendanceMutation.isPending
            }}
            disabled={!selectedSite}
          />
        )}

        {/* Enhanced Guard Selection Modal */}
        <EnhancedGuardSelectionModal
          isOpen={allocationModal.isOpen}
          onClose={() => setAllocationModal(prev => ({ ...prev, isOpen: false }))}
          guards={getAvailableGuardsForSlot(allocationModal.slotId, allocationModal.shiftType)}
          onGuardSelect={handleGuardAssignment}
          title={allocationModal.isReplacement ? "Replace Guard" : "Assign Guard"}
          excludeGuardIds={allocationModal.originalGuardId ? [allocationModal.originalGuardId] : []}
          preferredRole={allocationModal.roleType}
        />

        {/* Temporary Slots Management */}
        <TemporarySlotsManagementDialog
          isOpen={temporarySlotsDialog}
          onClose={() => setTemporarySlotsDialog(false)}
          siteId={selectedSite}
          date={format(selectedDate, 'yyyy-MM-dd')}
          temporarySlots={temporarySlots}
        />
      </div>
    </div>
  );
};

export default ModernSlotBasedAttendance;