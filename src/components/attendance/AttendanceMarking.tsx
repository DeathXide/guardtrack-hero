
import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Check, Copy, RefreshCw, Info, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AttendanceSlotCard from './AttendanceSlotCard';
import GuardSelectionModal from './GuardSelectionModal';
import TemporarySlotDialog from './TemporarySlotDialog';
import BulkTemporarySlotDialog from './BulkTemporarySlotDialog';
import {
  fetchSites,
  fetchGuards,
  fetchShiftsBySite,
  createShift,
  updateShift,
  createAttendanceRecord,
  fetchAttendanceByDate,
  isGuardMarkedPresentElsewhere,
  deleteAttendanceRecord,
  deleteShift,
  fetchSiteMonthlyEarnings,
  formatCurrency
} from '@/lib/localService';
import { checkGuardsAttendanceForToday, deleteGuardsTodayAttendance, GuardAttendanceInfo } from './attendanceValidation';
import UnassignGuardConfirmationDialog from './UnassignGuardConfirmationDialog';
import { Site, Guard, Shift, AttendanceRecord, SiteEarnings } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AttendanceMarkingProps {
  preselectedSiteId?: string;
}

const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedGuards, setSelectedGuards] = useState<Record<string, string[]>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ day: true, night: true });
  const [guardSelectionModal, setGuardSelectionModal] = useState<{
    isOpen: boolean;
    shiftType: 'day' | 'night';
    title: string;
  }>({ isOpen: false, shiftType: 'day', title: '' });
  const [unavailableGuards, setUnavailableGuards] = useState<string[]>([]);
  const [unavailableDayGuards, setUnavailableDayGuards] = useState<string[]>([]);
  const [unavailableNightGuards, setUnavailableNightGuards] = useState<string[]>([]);
  const [modalSelectedGuards, setModalSelectedGuards] = useState<string[]>([]);
  const [showUnassignConfirmation, setShowUnassignConfirmation] = useState(false);
  const [guardsToUnassign, setGuardsToUnassign] = useState<GuardAttendanceInfo[]>([]);
  const [pendingUnassignment, setPendingUnassignment] = useState<{ 
    shiftType: 'day' | 'night'; 
    selectedGuards: string[]; 
  } | null>(null);
  const [tempSlotDialog, setTempSlotDialog] = useState<{
    isOpen: boolean;
    shiftType: 'day' | 'night';
  }>({ isOpen: false, shiftType: 'day' });
  const [bulkTempSlotDialog, setBulkTempSlotDialog] = useState(false);
  const [editTempSlotDialog, setEditTempSlotDialog] = useState<{
    isOpen: boolean;
    slot: Shift | null;
  }>({ isOpen: false, slot: null });
  
  const queryClient = useQueryClient();
  
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const currentMonth = format(selectedDate, 'yyyy-MM');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', formattedDate],
    queryFn: () => fetchAttendanceByDate(formattedDate),
    enabled: !!formattedDate
  });

  const { data: siteEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['site-earnings', selectedSite, currentMonth],
    queryFn: () => fetchSiteMonthlyEarnings(selectedSite, currentMonth),
    enabled: !!selectedSite && !!currentMonth
  });

  const markAttendanceMutation = useMutation({
    mutationFn: createAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['site-earnings', selectedSite, currentMonth] });
      toast.success('Attendance marked successfully');
    },
    onError: (error) => {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: deleteAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['site-earnings', selectedSite, currentMonth] });
      toast.success('Attendance record removed successfully');
    },
    onError: (error) => {
      console.error('Error removing attendance record:', error);
      toast.error('Failed to remove attendance record');
    }
  });

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const daySlots = selectedSiteData?.daySlots || 0;
  const nightSlots = selectedSiteData?.nightSlots || 0;
  const sitePayRate = selectedSiteData?.payRate || 0;
  const totalSlots = daySlots + nightSlots;
  const payRatePerShift = totalSlots > 0 ? sitePayRate / totalSlots : 0;

  // Get assigned guards for each shift type (exclude temporary slots)
  const dayShiftGuards = guards.filter(guard => 
    shifts.some(shift => shift.type === 'day' && shift.guardId === guard.id && !shift.isTemporary)
  );
  
  const nightShiftGuards = guards.filter(guard => 
    shifts.some(shift => shift.type === 'night' && shift.guardId === guard.id && !shift.isTemporary)
  );

  // Get temporary slots filtered by date
  const dayTemporarySlots = shifts.filter(shift => 
    shift.type === 'day' && 
    shift.isTemporary && 
    shift.temporaryDate === formattedDate &&
    shift.siteId === selectedSite
  );
  
  const nightTemporarySlots = shifts.filter(shift => 
    shift.type === 'night' && 
    shift.isTemporary && 
    shift.temporaryDate === formattedDate &&
    shift.siteId === selectedSite
  );

  // Get present guards from attendance records
  const presentDayGuards = attendanceRecords
    .filter(record => {
      const shift = shifts.find(s => s.id === record.shiftId);
      return record.status === 'present' && shift?.type === 'day' && shift?.siteId === selectedSite;
    })
    .map(record => record.guardId);

  const presentNightGuards = attendanceRecords
    .filter(record => {
      const shift = shifts.find(s => s.id === record.shiftId);
      return record.status === 'present' && shift?.type === 'night' && shift?.siteId === selectedSite;
    })
    .map(record => record.guardId);

  // Initialize selected guards based on attendance records
  useEffect(() => {
    setSelectedGuards({
      day: presentDayGuards,
      night: presentNightGuards
    });
  }, [attendanceRecords, shifts, selectedSite]);

  // Calculate unavailable guards for each shift type
  useEffect(() => {
    if (selectedSite && formattedDate) {
      const calculateUnavailable = async () => {
        const dayUnavailable = await getUnavailableGuards('day');
        const nightUnavailable = await getUnavailableGuards('night');
        setUnavailableDayGuards(dayUnavailable);
        setUnavailableNightGuards(nightUnavailable);
      };
      calculateUnavailable();
    }
  }, [guards, formattedDate, selectedSite]);

  const handleGuardSelect = async (guardId: string, shiftType: 'day' | 'night') => {
    const currentSelected = selectedGuards[shiftType] || [];
    const isSelected = currentSelected.includes(guardId);
    const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
    
    // Validate inputs
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }
    
    if (maxSlots === 0) {
      toast.error(`No ${shiftType} slots available for this site`);
      return;
    }
    
    if (isSelected) {
      // Remove guard - remove from attendance only (keep shift assignment)
      const record = attendanceRecords.find(record => {
        const shift = shifts.find(s => s.id === record.shiftId);
        return record.guardId === guardId && 
               record.status === 'present' && 
               shift?.type === shiftType &&
               shift?.siteId === selectedSite;
      });
      
      if (record && record.id) {
        try {
          await deleteAttendanceMutation.mutateAsync(record.id);
          setSelectedGuards({
            ...selectedGuards,
            [shiftType]: currentSelected.filter(id => id !== guardId)
          });
        } catch (error) {
          console.error('Error removing attendance:', error);
          toast.error('Failed to remove attendance');
        }
      } else {
        // If no attendance record found, just update local state
        setSelectedGuards({
          ...selectedGuards,
          [shiftType]: currentSelected.filter(id => id !== guardId)
        });
      }
    } else {
      // Check slot limit first
      if (currentSelected.length >= maxSlots) {
        toast.error(`Cannot mark more than ${maxSlots} guards present for ${shiftType} shift`);
        return;
      }
      
      // Check if guard is assigned to this shift
      const assignedShift = shifts.find(s => 
        s.type === shiftType && 
        s.siteId === selectedSite && 
        s.guardId === guardId
      );
      
      if (!assignedShift) {
        toast.error(`Guard is not assigned to ${shiftType} shift at this site. Please assign them first.`);
        return;
      }
      
      // Add guard - check availability first
      try {
        const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
          guardId, 
          formattedDate, 
          shiftType, 
          selectedSite
        );
        
        if (isMarkedElsewhere) {
          toast.error('This guard is already marked present at another site for this shift');
          return;
        }
        
        // Mark attendance
        await markAttendanceMutation.mutateAsync({
          date: formattedDate,
          shiftId: assignedShift.id,
          guardId,
          status: 'present' as const
        });
        
        setSelectedGuards({
          ...selectedGuards,
          [shiftType]: [...currentSelected, guardId]
        });
      } catch (error) {
        console.error('Error marking attendance:', error);
        toast.error('Failed to mark attendance');
      }
    }
  };

  const handleAddGuard = async (shiftType: 'day' | 'night') => {
    const unavailable = await getUnavailableGuards(shiftType);
    setUnavailableGuards(unavailable);
    // Reset modal selection and set currently assigned guards as selected
    const currentlyAssigned = shiftType === 'day' ? dayShiftGuards.map(g => g.id) : nightShiftGuards.map(g => g.id);
    setModalSelectedGuards(currentlyAssigned);
    setGuardSelectionModal({
      isOpen: true,
      shiftType,
      title: `Add Guards to ${shiftType === 'day' ? 'Day' : 'Night'} Shift`
    });
  };

  const handleToggleCardExpansion = (shiftType: 'day' | 'night') => {
    setExpandedCards({
      ...expandedCards,
      [shiftType]: !expandedCards[shiftType]
    });
  };

  const handleAddTemporarySlot = (shiftType: 'day' | 'night') => {
    setTempSlotDialog({ isOpen: true, shiftType });
  };

  const handleSaveTemporarySlot = async (data: {
    shiftType: 'day' | 'night';
    role: string;
    payRate: number;
  }) => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    try {
      const newShift = await createShift({
        siteId: selectedSite,
        type: data.shiftType,
        guardId: '', // Temporary slots start unassigned
        isTemporary: true,
        temporaryDate: formattedDate,
        temporaryRole: data.role,
        temporaryPayRate: data.payRate
      });

      // Refresh shifts data
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success(`Temporary ${data.role} slot created for ${data.shiftType} shift`);
      setTempSlotDialog({ isOpen: false, shiftType: 'day' });
    } catch (error) {
      console.error('Error creating temporary slot:', error);
      toast.error('Failed to create temporary slot');
    }
  };

  const handleBulkTempSlotSave = async (roleSlots: Array<{
    id: string;
    role: string;
    daySlots: number;
    nightSlots: number;
    payRatePerSlot: number;
  }>) => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    try {
      const promises = [];
      
      for (const roleSlot of roleSlots) {
        // Create day slots
        for (let i = 0; i < roleSlot.daySlots; i++) {
          promises.push(createShift({
            siteId: selectedSite,
            type: 'day',
            guardId: '',
            isTemporary: true,
            temporaryDate: formattedDate,
            temporaryRole: roleSlot.role,
            temporaryPayRate: roleSlot.payRatePerSlot
          }));
        }
        
        // Create night slots
        for (let i = 0; i < roleSlot.nightSlots; i++) {
          promises.push(createShift({
            siteId: selectedSite,
            type: 'night',
            guardId: '',
            isTemporary: true,
            temporaryDate: formattedDate,
            temporaryRole: roleSlot.role,
            temporaryPayRate: roleSlot.payRatePerSlot
          }));
        }
      }

      await Promise.all(promises);

      // Refresh shifts data
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      
      const totalSlots = roleSlots.reduce((total, slot) => total + slot.daySlots + slot.nightSlots, 0);
      toast.success(`Created ${totalSlots} temporary slots across ${roleSlots.length} roles`);
      setBulkTempSlotDialog(false);
    } catch (error) {
      console.error('Error creating bulk temporary slots:', error);
      toast.error('Failed to create temporary slots');
    }
  };

  const handleEditTemporarySlot = (slot: Shift) => {
    setEditTempSlotDialog({ isOpen: true, slot });
  };

  const handleDeleteTemporarySlot = async (slotId: string) => {
    try {
      // Check if there's an attendance record for this slot
      const attendanceRecord = attendanceRecords.find(record => 
        record.shiftId === slotId && record.status === 'present'
      );
      
      if (attendanceRecord && attendanceRecord.id) {
        await deleteAttendanceMutation.mutateAsync(attendanceRecord.id);
      }
      
      await deleteShift(slotId);
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Temporary slot deleted successfully');
    } catch (error) {
      console.error('Error deleting temporary slot:', error);
      toast.error('Failed to delete temporary slot');
    }
  };

  const handleAssignGuardToTempSlot = async (slotId: string, guardId: string) => {
    try {
      await updateShift(slotId, { guardId });
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      
      if (guardId) {
        toast.success('Guard assigned to temporary slot');
      } else {
        toast.success('Guard unassigned from temporary slot');
      }
    } catch (error) {
      console.error('Error updating temporary slot assignment:', error);
      toast.error('Failed to update slot assignment');
    }
  };

  const getUnavailableGuards = async (shiftType: 'day' | 'night') => {
    const unavailable: string[] = [];
    
    for (const guard of guards) {
      const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
        guard.id, 
        formattedDate, 
        shiftType, 
        selectedSite
      );
      if (isMarkedElsewhere) {
        unavailable.push(guard.id);
      }
    }
    
    return unavailable;
  };

  const handleCopyYesterday = async () => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    const yesterday = subDays(selectedDate, 1);
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    try {
      // Get yesterday's attendance records
      const yesterdayRecords = await fetchAttendanceByDate(yesterdayFormatted);
      
      // Filter records for the selected site
      const siteYesterdayRecords = yesterdayRecords.filter(record => {
        const shift = shifts.find(s => s.id === record.shiftId);
        return shift?.siteId === selectedSite && record.status === 'present';
      });

      if (siteYesterdayRecords.length === 0) {
        toast.info('No attendance records found for yesterday at this site');
        return;
      }

      let successCount = 0;
      let skippedCount = 0;

      // Mark the same guards present for today
      for (const record of siteYesterdayRecords) {
        const yesterdayShift = shifts.find(s => s.id === record.shiftId);
        if (yesterdayShift) {
          // Find the current shift assignment for this guard and shift type
          const currentShift = shifts.find(s => 
            s.type === yesterdayShift.type && 
            s.siteId === selectedSite && 
            s.guardId === record.guardId
          );

          if (!currentShift) {
            console.log(`Guard ${record.guardId} not assigned to ${yesterdayShift.type} shift anymore, skipping`);
            skippedCount++;
            continue;
          }

          // Check if guard is available today
          const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
            record.guardId, 
            formattedDate, 
            yesterdayShift.type, 
            selectedSite
          );
          
          if (isMarkedElsewhere) {
            console.log(`Guard ${record.guardId} marked elsewhere, skipping`);
            skippedCount++;
            continue;
          }

          // Check slot limits
          const shiftType = yesterdayShift.type;
          const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
          const currentSelected = selectedGuards[shiftType] || [];
          
          if (currentSelected.length >= maxSlots) {
            console.log(`No slots available for ${shiftType} shift, skipping`);
            skippedCount++;
            continue;
          }

          // Check if already marked present today
          const alreadyMarked = attendanceRecords.some(ar => 
            ar.guardId === record.guardId && 
            ar.status === 'present' &&
            shifts.find(s => s.id === ar.shiftId)?.type === shiftType &&
            shifts.find(s => s.id === ar.shiftId)?.siteId === selectedSite
          );

          if (alreadyMarked) {
            console.log(`Guard ${record.guardId} already marked present, skipping`);
            skippedCount++;
            continue;
          }

          await markAttendanceMutation.mutateAsync({
            date: formattedDate,
            shiftId: currentShift.id,
            guardId: record.guardId,
            status: 'present' as const
          });
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Copied ${successCount} attendance records from yesterday`);
      }
      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} guards (not assigned, unavailable, or already marked)`);
      }
      if (successCount === 0 && skippedCount === 0) {
        toast.info('No attendance records could be copied');
      }
    } catch (error) {
      console.error('Error copying yesterday\'s attendance:', error);
      toast.error('Failed to copy yesterday\'s attendance');
    }
  };

  const handleReset = async () => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    try {
      // Get today's attendance records for this site
      const todayRecords = attendanceRecords.filter(record => {
        const shift = shifts.find(s => s.id === record.shiftId);
        return shift?.siteId === selectedSite && record.status === 'present';
      });

      if (todayRecords.length === 0) {
        toast.info('No attendance records to clear for today');
        return;
      }

      // Delete all attendance records for today at this site
      for (const record of todayRecords) {
        if (record.id) {
          await deleteAttendanceMutation.mutateAsync(record.id);
        }
      }
      
      toast.success('All attendance records cleared for today');
    } catch (error) {
      console.error('Error resetting attendance:', error);
      toast.error('Failed to reset attendance');
    }
  };

  const handleGuardSelectionConfirm = async () => {
    const { shiftType } = guardSelectionModal;
    const currentlyAssigned = shiftType === 'day' ? dayShiftGuards.map(g => g.id) : nightShiftGuards.map(g => g.id);
    const guardsToRemove = currentlyAssigned.filter(guardId => !modalSelectedGuards.includes(guardId));
    
    // Check if any guards being removed have today's attendance records
    if (guardsToRemove.length > 0) {
      const guardsWithTodayAttendance = await checkGuardsAttendanceForToday(
        guardsToRemove,
        selectedSite,
        formattedDate,
        shifts
      );
      
      if (guardsWithTodayAttendance.length > 0) {
        setGuardsToUnassign(guardsWithTodayAttendance);
        setPendingUnassignment({ shiftType, selectedGuards: modalSelectedGuards });
        setShowUnassignConfirmation(true);
        return;
      }
    }
    
    await performGuardAssignmentUpdate(shiftType, modalSelectedGuards);
  };

  const handleConfirmUnassign = async () => {
    try {
      // Delete today's attendance records first
      await deleteGuardsTodayAttendance(guardsToUnassign);
      toast.success('Attendance records deleted successfully');
      
      // Then proceed with guard assignment update
      if (pendingUnassignment) {
        await performGuardAssignmentUpdate(pendingUnassignment.shiftType, pendingUnassignment.selectedGuards);
      }
    } catch (error) {
      console.error('Error deleting attendance records:', error);
      toast.error('Failed to delete attendance records');
    } finally {
      setShowUnassignConfirmation(false);
      setGuardsToUnassign([]);
      setPendingUnassignment(null);
    }
  };

  const handleCancelUnassign = () => {
    setShowUnassignConfirmation(false);
    setGuardsToUnassign([]);
    setPendingUnassignment(null);
  };

  const performGuardAssignmentUpdate = async (shiftType: 'day' | 'night', selectedGuards: string[]) => {
    const currentlyAssigned = shiftType === 'day' ? dayShiftGuards.map(g => g.id) : nightShiftGuards.map(g => g.id);
    
    // Remove unselected guards from shift assignments
    for (const guardId of currentlyAssigned) {
      if (!selectedGuards.includes(guardId)) {
        const shiftToDelete = shifts.find(s => s.type === shiftType && s.guardId === guardId && s.siteId === selectedSite);
        if (shiftToDelete) {
          try {
            await deleteShift(shiftToDelete.id);
            toast.success(`Guard unassigned from ${shiftType} shift`);
          } catch (error) {
            console.error('Error deleting shift assignment:', error);
            toast.error(`Failed to unassign guard from ${shiftType} shift`);
          }
        }
      }
    }
    
    // Create shift assignments for selected guards
    for (const guardId of selectedGuards) {
      const existingShift = shifts.find(s => s.type === shiftType && s.guardId === guardId && s.siteId === selectedSite);
      if (!existingShift) {
        try {
          await createShift({
            siteId: selectedSite,
            guardId: guardId,
            type: shiftType
          });
        } catch (error) {
          console.error('Error creating shift assignment:', error);
          toast.error(`Failed to assign guard to ${shiftType} shift`);
        }
      }
    }
    
    // Refresh shifts data
    queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
    toast.success('Guard assignments updated successfully');
    setGuardSelectionModal({ isOpen: false, shiftType: 'day', title: '' });
    setModalSelectedGuards([]);
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading sites and guards...</div>;
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
            Select date and site, then mark guard attendance using the visual interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleCopyYesterday}
                  disabled={markAttendanceMutation.isPending}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Yesterday
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleReset}
                  disabled={deleteAttendanceMutation.isPending}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              {selectedSite && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setBulkTempSlotDialog(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Temp Slots
                </Button>
              )}
            </div>

            {/* Site Info */}
            {selectedSite && (
              <div className="space-y-2">
                <Label>Site Details</Label>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Day slots:</span>
                    <Badge variant="outline">{daySlots}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Night slots:</span>
                    <Badge variant="outline">{nightSlots}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pay rate:</span>
                    <div className="flex items-center">
                      <Badge variant="outline">{formatCurrency(payRatePerShift)}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          <AttendanceSlotCard
            title="Day Shift"
            shiftType="day"
            totalSlots={daySlots}
            assignedGuards={dayShiftGuards}
            presentGuards={presentDayGuards}
            unavailableGuards={unavailableDayGuards}
            payRatePerShift={payRatePerShift}
            temporarySlots={dayTemporarySlots}
            guards={guards}
            onGuardSelect={(guardId) => handleGuardSelect(guardId, 'day')}
            onAddGuard={() => handleAddGuard('day')}
            onEditTemporarySlot={handleEditTemporarySlot}
            onDeleteTemporarySlot={handleDeleteTemporarySlot}
            onAssignGuardToTempSlot={handleAssignGuardToTempSlot}
            isExpanded={expandedCards.day}
            onToggleExpand={() => handleToggleCardExpansion('day')}
          />

          {/* Night Shift Card */}
          <AttendanceSlotCard
            title="Night Shift"
            shiftType="night"
            totalSlots={nightSlots}
            assignedGuards={nightShiftGuards}
            presentGuards={presentNightGuards}
            unavailableGuards={unavailableNightGuards}
            payRatePerShift={payRatePerShift}
            temporarySlots={nightTemporarySlots}
            guards={guards}
            onGuardSelect={(guardId) => handleGuardSelect(guardId, 'night')}
            onAddGuard={() => handleAddGuard('night')}
            onEditTemporarySlot={handleEditTemporarySlot}
            onDeleteTemporarySlot={handleDeleteTemporarySlot}
            onAssignGuardToTempSlot={handleAssignGuardToTempSlot}
            isExpanded={expandedCards.night}
            onToggleExpand={() => handleToggleCardExpansion('night')}
          />
        </div>
      )}

      {/* Guard Selection Modal */}
      <GuardSelectionModal
        isOpen={guardSelectionModal.isOpen}
        onClose={() => setGuardSelectionModal({ isOpen: false, shiftType: 'day', title: '' })}
        guards={guards}
        selectedGuards={modalSelectedGuards}
        onSelectionChange={setModalSelectedGuards}
        onConfirm={handleGuardSelectionConfirm}
        maxSelections={undefined} // Allow unlimited guard assignment
        title={guardSelectionModal.title}
        unavailableGuards={unavailableGuards}
      />

      {/* Unassign Confirmation Dialog */}
      <UnassignGuardConfirmationDialog
        isOpen={showUnassignConfirmation}
        onConfirm={handleConfirmUnassign}
        onCancel={handleCancelUnassign}
        siteName={selectedSiteData?.name || 'Unknown Site'}
        date={selectedDate}
        guards={guardsToUnassign.map(info => {
          const guard = guards.find(g => g.id === info.guardId);
          return {
            id: info.guardId,
            name: guard?.name || 'Unknown Guard',
            badgeNumber: guard?.badgeNumber || 'N/A'
          };
        })}
      />

      {/* Temporary Slot Dialog */}
      {selectedSiteData && (
        <TemporarySlotDialog
          isOpen={tempSlotDialog.isOpen}
          onClose={() => setTempSlotDialog({ isOpen: false, shiftType: 'day' })}
          onSave={handleSaveTemporarySlot}
          site={selectedSiteData}
          date={selectedDate}
          isSaving={false}
        />
      )}

      {/* Bulk Temporary Slot Dialog */}
      {selectedSiteData && (
        <BulkTemporarySlotDialog
          isOpen={bulkTempSlotDialog}
          onClose={() => setBulkTempSlotDialog(false)}
          onSave={handleBulkTempSlotSave}
          site={selectedSiteData}
          date={selectedDate}
          isSaving={false}
        />
      )}
    </div>
  );
};

export default AttendanceMarking;
