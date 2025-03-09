
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  CalendarDays, 
  Check, 
  Clock, 
  Moon, 
  Pencil, 
  Search, 
  ShieldAlert, 
  Sun, 
  User,
  X,
  ArrowRight,
  Building,
  UserPlus,
  UserCheck,
  Loader2,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import { AttendanceRecord, Guard, Site, Shift } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchSites,
  fetchSite,
  fetchGuards,
  fetchGuard,
  fetchShiftsBySite,
  fetchAttendanceByDate,
  createAttendanceRecord,
  updateAttendanceRecord,
  isGuardMarkedPresentElsewhere,
  calculateDailyRate,
  calculateMonthlyEarnings,
  createShift,
  updateShift,
  deleteShift,
  createGuard,
  updateGuard
} from '@/lib/supabaseService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Generate a random badge number
const generateBadgeNumber = () => {
  return `B${Math.floor(10000 + Math.random() * 90000)}`;
};

const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSite, setSelectedSite] = useState<string | undefined>();
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day');
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [guardAllocationDialogOpen, setGuardAllocationDialogOpen] = useState(false);
  const [manageShiftsDialogOpen, setManageShiftsDialogOpen] = useState(false);
  const [manageGuardsDialogOpen, setManageGuardsDialogOpen] = useState(false);
  const [createGuardDialogOpen, setCreateGuardDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'reassigned'>('present');
  const [replacementGuard, setReplacementGuard] = useState<string | undefined>();
  const [reassignedSite, setReassignedSite] = useState<string | undefined>();
  const [allocatedGuard, setAllocatedGuard] = useState<string | undefined>();
  const [newGuardName, setNewGuardName] = useState('');
  const [newGuardEmail, setNewGuardEmail] = useState('');
  const [newGuardPhone, setNewGuardPhone] = useState('');
  const [newGuardType, setNewGuardType] = useState<'permanent' | 'temporary'>('permanent');
  const [newGuardPayRate, setNewGuardPayRate] = useState('');
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const dateString = selectedDate 
    ? selectedDate.toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];
  
  // Fetch sites
  const { 
    data: sites = [],
    isLoading: sitesLoading
  } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });
  
  // Fetch guards
  const { 
    data: guards = [],
    isLoading: guardsLoading
  } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });
  
  // Set selected site when sites are loaded
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);
  
  // Fetch selected site details
  const { 
    data: selectedSiteDetails,
    isLoading: siteDetailsLoading
  } = useQuery({
    queryKey: ['site', selectedSite],
    queryFn: () => selectedSite ? fetchSite(selectedSite) : null,
    enabled: !!selectedSite
  });
  
  // Fetch shifts for selected site
  const { 
    data: siteShifts = [],
    isLoading: shiftsLoading
  } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });
  
  // Filter shifts by type
  const filteredShifts = siteShifts.filter(shift => shift.type === selectedShiftType);
  
  // Fetch attendance records for selected date
  const { 
    data: dateRecords = [],
    isLoading: attendanceLoading
  } = useQuery({
    queryKey: ['attendance', dateString],
    queryFn: () => fetchAttendanceByDate(dateString),
    enabled: !!dateString
  });
  
  // Mutations
  const createAttendanceMutation = useMutation({
    mutationFn: createAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  });
  
  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AttendanceRecord> }) => 
      updateAttendanceRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: 'Shift created',
        description: 'New shift has been added successfully',
      });
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shift> }) => 
      updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: 'Shift updated',
        description: 'Shift has been updated successfully',
      });
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({
        title: 'Shift deleted',
        description: 'Shift has been removed successfully',
      });
    }
  });

  const createGuardMutation = useMutation({
    mutationFn: createGuard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: 'Guard created',
        description: 'New guard has been added successfully',
      });
      setCreateGuardDialogOpen(false);
      resetGuardForm();
    }
  });

  const updateGuardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Guard> }) => 
      updateGuard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: 'Guard updated',
        description: 'Guard information has been updated successfully',
      });
      setCreateGuardDialogOpen(false);
      resetGuardForm();
    }
  });
  
  // Prepare shifts with attendance data
  const shiftsWithAttendance = React.useMemo(() => {
    if (shiftsLoading || attendanceLoading || guardsLoading || siteDetailsLoading) {
      return [];
    }
    
    return Promise.all(filteredShifts.map(async (shift) => {
      const attendanceRecord = dateRecords.find(record => record.shiftId === shift.id);
      const guard = shift.guardId ? await fetchGuard(shift.guardId) : null;
      
      // Create temporary record if none exists, making sure to include all required properties
      const record = attendanceRecord || {
        id: `temp-${shift.id}-${dateString}`,
        date: dateString,
        shiftId: shift.id,
        guardId: shift.guardId || '',
        status: 'present',
        replacementGuardId: undefined,
        reassignedSiteId: undefined,
        notes: undefined
      };
      
      const isPresentElsewhere = guard ? 
        await isGuardMarkedPresentElsewhere(guard.id, dateString, selectedShiftType, selectedSiteDetails?.id) : 
        false;
      
      const replacementGuard = record.replacementGuardId 
        ? await fetchGuard(record.replacementGuardId) 
        : null;
      
      const reassignedSite = record.reassignedSiteId
        ? await fetchSite(record.reassignedSiteId)
        : null;
      
      const dailyRate = guard ? calculateDailyRate(guard) : 0;
      
      return {
        shift,
        record,
        guard,
        replacementGuard,
        reassignedSite,
        isPresentElsewhere,
        dailyRate
      };
    }));
  }, [filteredShifts, dateRecords, selectedShiftType, dateString, selectedSiteDetails?.id, shiftsLoading, attendanceLoading, guardsLoading, siteDetailsLoading]);
  
  const [resolvedShifts, setResolvedShifts] = useState<any[]>([]);
  
  // Resolve promises from shiftsWithAttendance
  useEffect(() => {
    if (shiftsWithAttendance instanceof Promise) {
      shiftsWithAttendance.then(resolved => {
        setResolvedShifts(resolved);
      });
    } else if (Array.isArray(shiftsWithAttendance)) {
      setResolvedShifts(shiftsWithAttendance);
    }
  }, [shiftsWithAttendance]);
  
  const siteOptions = sites.map(site => ({
    value: site.id,
    label: site.name
  }));
  
  const handleMarkAttendance = async (shift: Shift, guard: Guard | undefined) => {
    if (!guard) return;
    
    const isPresentElsewhere = await isGuardMarkedPresentElsewhere(guard.id, dateString, selectedShiftType, selectedSiteDetails?.id);
    
    if (isPresentElsewhere) {
      toast({
        title: "Guard already assigned",
        description: `${guard.name} is already marked present at another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedRecord({
      id: `temp-${shift.id}-${dateString}`,
      date: dateString,
      shiftId: shift.id,
      guardId: guard.id,
      status: 'present',
    });
    setSelectedGuard(guard);
    setAttendanceStatus('present');
    setNotes('');
    setAttendanceDialogOpen(true);
  };
  
  const handleAssignReplacement = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReplacementGuard(undefined);
    setNotes('');
    setReplacementDialogOpen(true);
  };
  
  const handleReassignToSite = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReassignedSite(undefined);
    setNotes('');
    setReassignDialogOpen(true);
  };

  const handleAllocateGuard = (shift: Shift) => {
    setSelectedShift(shift);
    setAllocatedGuard(undefined);
    setGuardAllocationDialogOpen(true);
  };

  const handleManageShifts = () => {
    setManageShiftsDialogOpen(true);
  };

  const handleAddShift = async () => {
    if (!selectedSite) return;

    try {
      await createShiftMutation.mutateAsync({
        siteId: selectedSite,
        type: selectedShiftType,
      });
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: 'Error creating shift',
        description: 'There was a problem adding a new shift.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await deleteShiftMutation.mutateAsync(shiftId);
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: 'Error deleting shift',
        description: 'There was a problem removing the shift.',
        variant: 'destructive'
      });
    }
  };

  const handleManageGuards = () => {
    setManageGuardsDialogOpen(true);
  };

  const handleCreateGuard = () => {
    setEditingGuard(null);
    resetGuardForm();
    setCreateGuardDialogOpen(true);
  };

  const handleEditGuard = (guard: Guard) => {
    setEditingGuard(guard);
    setNewGuardName(guard.name);
    setNewGuardEmail(guard.email || '');
    setNewGuardPhone(guard.phone || '');
    setNewGuardType(guard.type || 'permanent');
    setNewGuardPayRate(guard.payRate ? guard.payRate.toString() : '');
    setCreateGuardDialogOpen(true);
  };

  const resetGuardForm = () => {
    setNewGuardName('');
    setNewGuardEmail('');
    setNewGuardPhone('');
    setNewGuardType('permanent');
    setNewGuardPayRate('');
    setEditingGuard(null);
  };

  const handleSubmitGuard = async () => {
    if (!newGuardName) {
      toast({
        title: "Missing information",
        description: "Guard name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingGuard) {
        // Update existing guard
        await updateGuardMutation.mutateAsync({
          id: editingGuard.id,
          data: {
            name: newGuardName,
            email: newGuardEmail || undefined,
            phone: newGuardPhone || undefined,
            type: newGuardType,
            payRate: newGuardPayRate ? parseFloat(newGuardPayRate) : undefined
          }
        });
      } else {
        // Create new guard
        await createGuardMutation.mutateAsync({
          name: newGuardName,
          email: newGuardEmail || undefined,
          phone: newGuardPhone || undefined,
          badgeNumber: generateBadgeNumber(),
          type: newGuardType,
          payRate: newGuardPayRate ? parseFloat(newGuardPayRate) : undefined,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Error saving guard:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingGuard ? 'update' : 'create'} guard.`,
        variant: 'destructive'
      });
    }
  };
  
  const saveAttendance = async () => {
    if (!selectedRecord || !selectedGuard) return;
    
    const existingRecord = dateRecords.find(r => r.shiftId === selectedRecord.shiftId);
    
    const recordData = {
      date: dateString,
      shiftId: selectedRecord.shiftId,
      guardId: selectedGuard.id,
      status: attendanceStatus,
      notes: notes || undefined
    };
    
    try {
      if (existingRecord) {
        await updateAttendanceMutation.mutateAsync({ 
          id: existingRecord.id, 
          data: recordData 
        });
      } else {
        await createAttendanceMutation.mutateAsync(recordData);
      }
      
      toast({
        title: 'Attendance recorded',
        description: `${selectedGuard.name} marked as ${attendanceStatus} for ${formatDate(dateString)}`,
      });
      
      setAttendanceDialogOpen(false);
      
      // Open follow-up dialogs if needed
      if (attendanceStatus === 'absent') {
        setReplacementDialogOpen(true);
      } else if (attendanceStatus === 'reassigned') {
        setReassignDialogOpen(true);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error saving attendance',
        description: 'There was a problem saving the attendance record.',
        variant: 'destructive'
      });
    }
  };
  
  const saveReplacement = async () => {
    if (!selectedRecord || !selectedGuard || !replacementGuard) return;
    
    const isPresentElsewhere = await isGuardMarkedPresentElsewhere(replacementGuard, dateString, selectedShiftType, selectedSiteDetails?.id);
    
    if (isPresentElsewhere) {
      toast({
        title: "Guard already assigned",
        description: `Selected replacement is already marked present at another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    const existingRecord = dateRecords.find(r => r.shiftId === selectedRecord.shiftId);
    
    try {
      if (existingRecord) {
        await updateAttendanceMutation.mutateAsync({
          id: existingRecord.id,
          data: {
            status: 'replaced',
            replacementGuardId: replacementGuard,
            notes: notes || existingRecord.notes
          }
        });
      } else {
        await createAttendanceMutation.mutateAsync({
          date: dateString,
          shiftId: selectedRecord.shiftId,
          guardId: selectedGuard.id,
          status: 'replaced',
          replacementGuardId: replacementGuard,
          notes
        });
      }
      
      const replacement = await fetchGuard(replacementGuard);
      
      toast({
        title: 'Replacement assigned',
        description: `${replacement?.name} assigned as replacement for ${selectedGuard.name}`,
      });
      
      setReplacementDialogOpen(false);
    } catch (error) {
      console.error('Error saving replacement:', error);
      toast({
        title: 'Error assigning replacement',
        description: 'There was a problem assigning the replacement guard.',
        variant: 'destructive'
      });
    }
  };
  
  const saveReassignment = async () => {
    if (!selectedRecord || !selectedGuard || !reassignedSite) return;
    
    const existingRecord = dateRecords.find(r => r.shiftId === selectedRecord.shiftId);
    const targetSite = await fetchSite(reassignedSite);
    
    try {
      if (existingRecord) {
        await updateAttendanceMutation.mutateAsync({
          id: existingRecord.id,
          data: {
            status: 'reassigned',
            reassignedSiteId: reassignedSite,
            notes: notes || existingRecord.notes
          }
        });
      } else {
        await createAttendanceMutation.mutateAsync({
          date: dateString,
          shiftId: selectedRecord.shiftId,
          guardId: selectedGuard.id,
          status: 'reassigned',
          reassignedSiteId: reassignedSite,
          notes
        });
      }
      
      toast({
        title: 'Guard reassigned',
        description: `${selectedGuard.name} reassigned to ${targetSite?.name}`,
      });
      
      setReassignDialogOpen(false);
    } catch (error) {
      console.error('Error saving reassignment:', error);
      toast({
        title: 'Error reassigning guard',
        description: 'There was a problem reassigning the guard.',
        variant: 'destructive'
      });
    }
  };

  const saveGuardAllocation = async () => {
    if (!selectedShift || !allocatedGuard) return;
    
    const guard = await fetchGuard(allocatedGuard);
    
    if (await isGuardMarkedPresentElsewhere(allocatedGuard, dateString, selectedShiftType, selectedSiteDetails?.id)) {
      toast({
        title: "Guard already assigned",
        description: `${guard?.name} is already assigned to another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Update the shift with the allocated guard
      await updateShiftMutation.mutateAsync({
        id: selectedShift.id,
        data: {
          guardId: allocatedGuard
        }
      });
      
      // Create attendance record for the allocated guard
      if (guard) {
        await createAttendanceMutation.mutateAsync({
          date: dateString,
          shiftId: selectedShift.id,
          guardId: allocatedGuard,
          status: 'present'
        });
      }
      
      toast({
        title: 'Guard allocated',
        description: `${guard?.name} has been allocated to this shift`,
      });
      
      setGuardAllocationDialogOpen(false);
    } catch (error) {
      console.error('Error allocating guard:', error);
      toast({
        title: 'Error allocating guard',
        description: 'There was a problem allocating the guard to the shift.',
        variant: 'destructive'
      });
    }
  };
  
  const getAvailableGuards = () => {
    return guards.filter(guard => {
      if (guard.status === 'inactive') {
        return false;
      }
      
      // This is a simplified check - we should ideally use the async function
      // but that would complicate this component even more
      return !resolvedShifts.some(item => 
        item.guard?.id === guard.id && item.isPresentElsewhere
      );
    });
  };
  
  const getAvailableReassignmentSites = () => {
    return sites.filter(site => site.id !== selectedSite);
  };
  
  const isLoading = sitesLoading || guardsLoading || shiftsLoading || attendanceLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Mark and manage daily attendance for all sites
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleManageShifts} variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Manage Shifts
          </Button>
          <Button onClick={handleManageGuards} variant="outline">
            <User className="h-4 w-4 mr-2" />
            Manage Guards
          </Button>
          <Button onClick={() => filteredShifts.length > 0 && handleAllocateGuard(filteredShifts[0])} disabled={!selectedSite || filteredShifts.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            Allocate Guard
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 overflow-hidden">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose a date to view or mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-full max-w-[300px]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full mx-auto"
              />
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Selected Date:</span>
                  <Badge variant="outline" className="font-mono">
                    {dateString}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Day:</span>
                  <span className="font-medium">
                    {selectedDate 
                      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) 
                      : new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Attendance Sheet</CardTitle>
              <CardDescription>
                {selectedSiteDetails ? selectedSiteDetails.name : 'No site selected'} • {selectedShiftType === 'day' ? 'Day Shift' : 'Night Shift'} • {formatDate(dateString)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent searchable>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedShiftType} onValueChange={(value) => setSelectedShiftType(value as 'day' | 'night')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Shift type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
              
              <Badge className="text-xs">
                {selectedSiteDetails 
                  ? (selectedShiftType === 'day' 
                    ? `${selectedSiteDetails.daySlots} slots` 
                    : `${selectedSiteDetails.nightSlots} slots`)
                  : '0 slots'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedSiteDetails ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Site Selected</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Please select a site from the dropdown to view attendance records.
                </p>
              </div>
            ) : resolvedShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Shifts Found</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  There are no {selectedShiftType} shifts assigned for this site. Create shifts first.
                </p>
                <Button
                  className="mt-4"
                  onClick={handleAddShift}
                  disabled={createShiftMutation.isPending}
                >
                  {createShiftMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Shift
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="min-w-full overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="py-3 px-4 text-left text-sm font-medium">#</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Guard</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Status</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Pay</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {resolvedShifts.map((item, index) => (
                        <tr key={item.shift.id}>
                          <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.guard?.avatar} alt={item.guard?.name} />
                                <AvatarFallback>{item.guard ? getInitials(item.guard.name) : 'N/A'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center flex-wrap">
                                  <p className="font-medium text-sm">{item.guard?.name || 'Unassigned'}</p>
                                  {item.isPresentElsewhere && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                      Assigned Elsewhere
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {item.guard?.type || 'Permanent'} • Badge #{item.guard?.badgeNumber || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.record.status === 'present' ? (
                              <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Present
                              </Badge>
                            ) : item.record.status === 'absent' ? (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                                <X className="h-3.5 w-3.5 mr-1" />
                                Absent
                              </Badge>
                            ) : item.record.status === 'reassigned' ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                  Reassigned
                                </Badge>
                                {item.reassignedSite && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <span className="truncate max-w-[120px]">
                                      To: {item.reassignedSite.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  Replaced
                                </Badge>
                                {item.replacementGuard && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <span className="truncate max-w-[120px]">
                                      By: {item.replacementGuard.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.record.status === 'present' || item.record.status === 'reassigned' ? (
                              <div className="text-sm font-medium">
                                ${item.dailyRate.toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">-</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => item.guard ? handleMarkAttendance(item.shift, item.guard) : handleAllocateGuard(item.shift)}
                                disabled={item.isPresentElsewhere}
                                title={item.isPresentElsewhere ? "Guard is already marked present at another site" : ""}
                              >
                                {!item.guard ? (
                                  <>
                                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                                    Assign
                                  </>
                                ) : (
                                  <>
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    Mark
                                  </>
                                )}
                              </Button>
                              
                              {item.record.status === 'absent' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleAssignReplacement(item.record, item.guard || undefined)}
                                >
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  Replace
                                </Button>
                              )}
                              
                              {item.record.status === 'absent' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleReassignToSite(item.record, item.guard || undefined)}
                                >
                                  <Building className="h-3.5 w-3.5 mr-1" />
                                  Reassign
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle>Attendance Statistics</CardTitle>
            <CardDescription>
              Summary for {formatDate(dateString)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSiteDetails ? (
              <div className="text-center text-muted-foreground py-8">
                Select a site to view statistics
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {resolvedShifts.filter(i => 
                      i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                    ).length}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-destructive mt-1">
                    {resolvedShifts.filter(i => i.record.status === 'absent').length}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-2xl font-bold mt-1">
                    {resolvedShifts.length > 0
                      ? Math.round(
                          (resolvedShifts.filter(
                            i => i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                          ).length / 
                          resolvedShifts.length) * 100
                        )
                      : 0}%
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Daily Earnings</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ${resolvedShifts
                      .filter(i => i.record.status === 'present' || i.record.status === 'reassigned')
                      .reduce((total, item) => total + item.dailyRate, 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Record attendance for {selectedGuard?.name} on {formatDate(dateString)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Attendance Status</Label>
              <RadioGroup value={attendanceStatus} onValueChange={(value) => setAttendanceStatus(value as 'present' | 'absent' | 'reassigned')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="present" id="present" />
                  <Label htmlFor="present" className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Present
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="absent" id="absent" />
                  <Label htmlFor="absent" className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-destructive" />
                    Absent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reassigned" id="reassigned" />
                  <Label htmlFor="reassigned" className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                    Reassigned to Another Site
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAttendance} disabled={createAttendanceMutation.isPending || updateAttendanceMutation.isPending}>
              {createAttendanceMutation.isPending || updateAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Replacement</DialogTitle>
            <DialogDescription>
              Select a replacement guard for {selectedGuard?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="replacement">Replacement Guard</Label>
              <Select value={replacementGuard} onValueChange={setReplacementGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent searchable>
                  {getAvailableGuards().map(guard => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.type || 'Permanent'}) - ${guard.payRate?.toFixed(2)}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableGuards().length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No available guards found. All guards may be assigned elsewhere.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="replacement-notes">Notes (Optional)</Label>
              <Textarea
                id="replacement-notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplacementDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveReplacement} 
              disabled={!replacementGuard || createAttendanceMutation.isPending || updateAttendanceMutation.isPending}
            >
              {createAttendanceMutation.isPending || updateAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Replacement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign to Another Site</DialogTitle>
            <DialogDescription>
              Select the site where {selectedGuard?.name} is working today
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="reassigned-site">Reassigned to Site</Label>
              <Select value={reassignedSite} onValueChange={setReassignedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent searchable>
                  {getAvailableReassignmentSites().map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reassignment-notes">Reason for Reassignment</Label>
              <Textarea
                id="reassignment-notes"
                placeholder="Explain why the guard was reassigned..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveReassignment} 
              disabled={!reassignedSite || createAttendanceMutation.isPending || updateAttendanceMutation.isPending}
            >
              {createAttendanceMutation.isPending || updateAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Reassignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={guardAllocationDialogOpen} onOpenChange={setGuardAllocationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Allocate Guard to Shift</DialogTitle>
            <DialogDescription>
              Select a guard to allocate to this shift
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="site-info">Site</Label>
                <Badge>
                  {selectedSiteDetails?.name || 'No site selected'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="shift-type">Shift Type</Label>
                <Badge variant="outline" className="capitalize">
                  {selectedShiftType} Shift
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="allocated-guard">Select Guard</Label>
              <Select value={allocatedGuard} onValueChange={setAllocatedGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent searchable>
                  {getAvailableGuards().map(guard => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.type || 'Permanent'}) - ${guard.payRate?.toFixed(2)}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableGuards().length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No available guards found. All guards may be assigned elsewhere.
                </p>
              )}
              
              <Button 
                onClick={handleCreateGuard}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create New Guard
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardAllocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveGuardAllocation} 
              disabled={!allocatedGuard || !selectedSite || createAttendanceMutation.isPending}
            >
              {createAttendanceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Allocating...
                </>
              ) : (
                'Allocate Guard'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageShiftsDialogOpen} onOpenChange={setManageShiftsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Shifts</DialogTitle>
            <DialogDescription>
              Create, edit, or delete shifts for {selectedSiteDetails?.name || 'this site'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Select value={selectedShiftType} onValueChange={(val) => setSelectedShiftType(val as 'day' | 'night')}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day Shift</SelectItem>
                    <SelectItem value="night">Night Shift</SelectItem>
                  </SelectContent>
                </Select>
                
                <Badge variant="outline">
                  {selectedSiteDetails 
                    ? (selectedShiftType === 'day' 
                      ? `${selectedSiteDetails.daySlots} slots` 
                      : `${selectedSiteDetails.nightSlots} slots`)
                    : '0 slots'}
                </Badge>
              </div>
              
              <Button onClick={handleAddShift} disabled={!selectedSite || createShiftMutation.isPending}>
                {createShiftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Shift
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            {filteredShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No shifts found for this site and shift type.</p>
                <p className="text-sm mt-1">Create shifts using the button above.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned Guard</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift, index) => {
                      const guardInfo = guards.find(g => g.id === shift.guardId);
                      return (
                        <TableRow key={shift.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="capitalize">{shift.type}</TableCell>
                          <TableCell>
                            {guardInfo ? (
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{getInitials(guardInfo.name)}</AvatarFallback>
                                </Avatar>
                                <span>{guardInfo.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedShift(shift);
                                  setGuardAllocationDialogOpen(true);
                                  setManageShiftsDialogOpen(false);
                                }}
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Assign
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteShift(shift.id)}
                                disabled={deleteShiftMutation.isPending}
                              >
                                {deleteShiftMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageShiftsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageGuardsDialogOpen} onOpenChange={setManageGuardsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Guards</DialogTitle>
            <DialogDescription>
              View, create and edit guards in the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search guards..."
                  className="pl-8"
                />
              </div>
              
              <Button onClick={handleCreateGuard}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Guard
              </Button>
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No guards found. Create one using the button above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    guards.map((guard) => (
                      <TableRow key={guard.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={guard.avatar} alt={guard.name} />
                              <AvatarFallback>{getInitials(guard.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{guard.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {guard.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{guard.badgeNumber}</TableCell>
                        <TableCell className="capitalize">{guard.type || 'permanent'}</TableCell>
                        <TableCell>${guard.payRate?.toFixed(2) || '0.00'}/month</TableCell>
                        <TableCell>
                          <Badge variant={guard.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                            {guard.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditGuard(guard)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageGuardsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createGuardDialogOpen} onOpenChange={setCreateGuardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingGuard ? 'Edit Guard' : 'Create New Guard'}</DialogTitle>
            <DialogDescription>
              {editingGuard 
                ? 'Update the information for this guard' 
                : 'Add a new guard to the system'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="guard-name">Name*</Label>
              <Input
                id="guard-name"
                placeholder="Full name"
                value={newGuardName}
                onChange={(e) => setNewGuardName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="guard-email">Email (Optional)</Label>
                <Input
                  id="guard-email"
                  type="email"
                  placeholder="Email address"
                  value={newGuardEmail}
                  onChange={(e) => setNewGuardEmail(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="guard-phone">Phone (Optional)</Label>
                <Input
                  id="guard-phone"
                  placeholder="Phone number"
                  value={newGuardPhone}
                  onChange={(e) => setNewGuardPhone(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="guard-type">Guard Type</Label>
                <Select 
                  value={newGuardType} 
                  onValueChange={(value) => setNewGuardType(value as 'permanent' | 'temporary')}
                >
                  <SelectTrigger id="guard-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="guard-pay">Monthly Pay Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5">$</span>
                  <Input
                    id="guard-pay"
                    type="number"
                    className="pl-7"
                    placeholder="0.00"
                    value={newGuardPayRate}
                    onChange={(e) => setNewGuardPayRate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {editingGuard && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm">Badge Number:</p>
                  <Badge variant="outline">{editingGuard.badgeNumber}</Badge>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGuardDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitGuard} 
              disabled={!newGuardName || createGuardMutation.isPending || updateGuardMutation.isPending}
            >
              {createGuardMutation.isPending || updateGuardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingGuard ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingGuard ? 'Update Guard' : 'Create Guard'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
