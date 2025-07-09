import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fetchSites, fetchGuards, fetchShiftsBySite, createShift, updateShift, deleteShift } from '@/lib/localService';
import { checkGuardsAttendanceForToday, deleteGuardsTodayAttendance, GuardAttendanceInfo } from '@/components/attendance/attendanceValidation';

export const useShiftAllocation = () => {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day');
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [guardSearchTerm, setGuardSearchTerm] = useState('');
  const [showUnassignConfirmation, setShowUnassignConfirmation] = useState(false);
  const [guardsToUnassign, setGuardsToUnassign] = useState<GuardAttendanceInfo[]>([]);
  const [pendingAllocation, setPendingAllocation] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const createShiftMutation = useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create shift: ${error.message}`);
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, shift }: { id: string; shift: Partial<any> }) => 
      updateShift(id, shift),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update shift: ${error.message}`);
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete shift: ${error.message}`);
    }
  });

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const daySlots = selectedSiteData?.daySlots || 0;
  const nightSlots = selectedSiteData?.nightSlots || 0;
  const dayShifts = shifts.filter(shift => shift.type === 'day');
  const nightShifts = shifts.filter(shift => shift.type === 'night');

  const handleOpenAllocationDialog = (shiftType: 'day' | 'night') => {
    setSelectedShiftType(shiftType);
    
    const currentShifts = shifts.filter(shift => shift.type === shiftType);
    const currentGuardIds = currentShifts.map(shift => shift.guardId).filter(id => id) as string[];
    setSelectedGuards(currentGuardIds);
    setGuardSearchTerm('');
    
    setIsAllocationDialogOpen(true);
  };

  const handleGuardSelection = (guardId: string) => {
    if (selectedGuards.includes(guardId)) {
      setSelectedGuards(selectedGuards.filter(id => id !== guardId));
    } else {
      setSelectedGuards([...selectedGuards, guardId]);
    }
  };

  const checkTodayAttendanceRecords = async (guardsToRemove: string[]): Promise<GuardAttendanceInfo[]> => {
    if (!selectedSite) return [];
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      const guardsWithAttendance = await checkGuardsAttendanceForToday(
        guardsToRemove,
        selectedSite,
        today,
        shifts
      );
      
      return guardsWithAttendance;
    } catch (error) {
      console.error('Error checking today\'s attendance records:', error);
      return [];
    }
  };

  const handleSaveAllocation = async () => {
    const shiftType = selectedShiftType;
    const existingShifts = shifts.filter(shift => shift.type === shiftType);
    const guardsToRemove = existingShifts
      .filter(shift => shift.guardId && !selectedGuards.includes(shift.guardId))
      .map(shift => shift.guardId)
      .filter((id): id is string => id !== undefined);
    
    // Check if any guards being removed have today's attendance records
    if (guardsToRemove.length > 0) {
      const guardsWithTodayAttendance = await checkTodayAttendanceRecords(guardsToRemove);
      
      if (guardsWithTodayAttendance.length > 0) {
        setGuardsToUnassign(guardsWithTodayAttendance);
        setPendingAllocation(selectedGuards);
        setShowUnassignConfirmation(true);
        return;
      }
    }
    
    await performAllocation();
  };

  const handleConfirmUnassign = async () => {
    try {
      // Delete today's attendance records first
      await deleteGuardsTodayAttendance(guardsToUnassign);
      toast.success('Attendance records deleted successfully');
      
      // Then proceed with normal allocation
      await performAllocation();
    } catch (error) {
      console.error('Error deleting attendance records:', error);
      toast.error('Failed to delete attendance records');
    }
  };

  const handleCancelUnassign = () => {
    setShowUnassignConfirmation(false);
    setGuardsToUnassign([]);
    setPendingAllocation([]);
  };

  const performAllocation = async () => {
    const shiftType = selectedShiftType;
    const existingShifts = shifts.filter(shift => shift.type === shiftType);
    
    for (const shift of existingShifts) {
      if (shift.guardId && !selectedGuards.includes(shift.guardId)) {
        try {
          await deleteShiftMutation.mutateAsync(shift.id);
        } catch (error) {
          console.error('Error deleting shift:', error);
        }
      }
    }
    
    for (const guardId of selectedGuards) {
      const existingShift = existingShifts.find(shift => shift.guardId === guardId);
      
      if (existingShift) {
        continue;
      } else {
        try {
          await createShiftMutation.mutateAsync({
            siteId: selectedSite,
            type: shiftType,
            guardId: guardId
          });
        } catch (error) {
          console.error('Error creating shift:', error);
        }
      }
    }
    
    refetchShifts();
    setIsAllocationDialogOpen(false);
    setShowUnassignConfirmation(false);
    setGuardsToUnassign([]);
    setPendingAllocation([]);
  };

  return {
    // State
    selectedSite,
    setSelectedSite,
    isAllocationDialogOpen,
    setIsAllocationDialogOpen,
    selectedShiftType,
    selectedGuards,
    guardSearchTerm,
    setGuardSearchTerm,
    showUnassignConfirmation,
    guardsToUnassign,
    
    // Data
    sites,
    guards,
    shifts,
    selectedSiteData,
    daySlots,
    nightSlots,
    dayShifts,
    nightShifts,
    
    // Loading states
    sitesLoading,
    guardsLoading,
    shiftsLoading,
    
    // Mutation states
    isSaving: createShiftMutation.isPending || updateShiftMutation.isPending || deleteShiftMutation.isPending,
    
    // Handlers
    handleOpenAllocationDialog,
    handleGuardSelection,
    handleSaveAllocation,
    handleConfirmUnassign,
    handleCancelUnassign,
  };
};