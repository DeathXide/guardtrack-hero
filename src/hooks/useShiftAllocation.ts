import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi } from '@/lib/guardsApi';
import { shiftsApi } from '@/lib/shiftsApi';
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
  
  // Fetch sites from Supabase
  const { data: sitesData = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites
  });

  // Transform Supabase site data to match expected interface
  const sites = sitesData.map(site => ({
    id: site.id,
    name: site.site_name,
    organizationName: site.organization_name,
    gstNumber: site.gst_number,
    addressLine1: site.address,
    addressLine2: "",
    addressLine3: "",
    gstType: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
    siteType: site.site_category,
    staffingSlots: site.staffing_requirements?.map(req => ({
      id: req.id,
      role: req.role_type as 'Security Guard' | 'Supervisor' | 'Housekeeping',
      budgetPerSlot: req.budget_per_slot,
      daySlots: req.day_slots,
      nightSlots: req.night_slots
    })) || []
  }));

  // Fetch guards from Supabase
  const { data: guardsData = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: guardsApi.getAllGuards
  });

  // Transform Supabase guard data to match expected interface
  const guards = guardsData.map(guard => ({
    id: guard.id,
    name: guard.name,
    badgeNumber: guard.badge_number,
    status: guard.status as 'active' | 'inactive',
    // Map other fields as needed
    dateOfBirth: guard.dob,
    gender: guard.gender as 'male' | 'female' | 'other',
    languagesSpoken: guard.languages,
    phone: guard.phone_number,
    alternatePhone: guard.alternate_phone_number,
    currentAddress: guard.current_address,
    type: guard.guard_type as 'permanent' | 'contract',
    payRate: guard.monthly_pay_rate
  }));

  // Fetch shifts from Supabase
  const { data: shiftsData = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? shiftsApi.getShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  // Transform Supabase shift data to match expected interface
  const shifts = shiftsData.map(shift => ({
    id: shift.id,
    siteId: shift.site_id,
    type: shift.type as 'day' | 'night',
    guardId: shift.guard_id
  }));

  const createShiftMutation = useMutation({
    mutationFn: shiftsApi.createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create shift: ${error.message}`);
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, shift }: { id: string; shift: any }) => 
      shiftsApi.updateShift(id, shift),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update shift: ${error.message}`);
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: shiftsApi.deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete shift: ${error.message}`);
    }
  });

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  // Calculate slots from staffing requirements
  const daySlots = selectedSiteData?.staffingSlots?.reduce((sum, slot) => sum + slot.daySlots, 0) || 0;
  const nightSlots = selectedSiteData?.staffingSlots?.reduce((sum, slot) => sum + slot.nightSlots, 0) || 0;
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
            site_id: selectedSite,
            type: shiftType,
            guard_id: guardId
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