import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, RefreshCw, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceSlotCard from './AttendanceSlotCard';
import GuardSelectionModal from './GuardSelectionModal';
import BulkOperations from './BulkOperations';
import QuickActions from './QuickActions';
import SearchAndFilter from './SearchAndFilter';
import { AttendanceMarkingSkeleton } from './LoadingStates';
import { NoSiteSelectedError, SlotLimitError, GuardConflictError } from './ErrorMessages';
import {
  fetchSites,
  fetchGuards,
  fetchShiftsBySite,
  createShift,
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

interface AttendanceMarkingEnhancedProps {
  preselectedSiteId?: string;
}

const AttendanceMarkingEnhanced: React.FC<AttendanceMarkingEnhancedProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedGuards, setSelectedGuards] = useState<Record<string, string[]>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({ day: true, night: true });
  const [guardSelectionModal, setGuardSelectionModal] = useState<{
    isOpen: boolean;
    shiftType: 'day' | 'night';
    title: string;
  }>({ isOpen: false, shiftType: 'day', title: '' });
  const [modalSelectedGuards, setModalSelectedGuards] = useState<string[]>([]);
  const [showUnassignConfirmation, setShowUnassignConfirmation] = useState(false);
  const [guardsToUnassign, setGuardsToUnassign] = useState<GuardAttendanceInfo[]>([]);
  const [pendingUnassignment, setPendingUnassignment] = useState<{ 
    shiftType: 'day' | 'night'; 
    selectedGuards: string[]; 
  } | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'unassigned'>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  
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

  // Get assigned guards for each shift type
  const dayShiftGuards = guards.filter(guard => 
    shifts.some(shift => shift.type === 'day' && shift.guardId === guard.id)
  );
  
  const nightShiftGuards = guards.filter(guard => 
    shifts.some(shift => shift.type === 'night' && shift.guardId === guard.id)
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

  const handleGuardSelect = async (guardId: string, shiftType: 'day' | 'night') => {
    const currentSelected = selectedGuards[shiftType] || [];
    const isSelected = currentSelected.includes(guardId);
    const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
    
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }
    
    if (maxSlots === 0) {
      toast.error(`No ${shiftType} slots available for this site`);
      return;
    }
    
    if (isSelected) {
      // Remove guard
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

  const handleBulkMarkAttendance = async (guardIds: string[], shiftType: 'day' | 'night', status: 'present' | 'absent') => {
    const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
    const currentSelected = selectedGuards[shiftType] || [];
    
    if (status === 'present' && currentSelected.length + guardIds.length > maxSlots) {
      toast.error(`Cannot mark more than ${maxSlots} guards present for ${shiftType} shift`);
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const guardId of guardIds) {
      try {
        const assignedShift = shifts.find(s => 
          s.type === shiftType && 
          s.siteId === selectedSite && 
          s.guardId === guardId
        );

        if (!assignedShift) {
          failureCount++;
          continue;
        }

        if (status === 'present') {
          const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
            guardId, 
            formattedDate, 
            shiftType, 
            selectedSite
          );
          
          if (isMarkedElsewhere) {
            failureCount++;
            continue;
          }
        }

        await markAttendanceMutation.mutateAsync({
          date: formattedDate,
          shiftId: assignedShift.id,
          guardId,
          status
        });
        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully marked ${successCount} guards as ${status}`);
    }
    if (failureCount > 0) {
      toast.error(`Failed to mark ${failureCount} guards`);
    }
  };

  const handleCopyFromDate = async (fromDate: Date) => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    const fromDateFormatted = format(fromDate, 'yyyy-MM-dd');
    
    try {
      const fromAttendanceRecords = await fetchAttendanceByDate(fromDateFormatted);
      
      const siteFromRecords = fromAttendanceRecords.filter(record => {
        const shift = shifts.find(s => s.id === record.shiftId);
        return shift?.siteId === selectedSite && record.status === 'present';
      });

      if (siteFromRecords.length === 0) {
        toast.info(`No attendance records found for ${format(fromDate, 'PPP')} at this site`);
        return;
      }

      let successCount = 0;
      let skippedCount = 0;

      for (const record of siteFromRecords) {
        const fromShift = shifts.find(s => s.id === record.shiftId);
        if (fromShift) {
          const currentShift = shifts.find(s => 
            s.type === fromShift.type && 
            s.siteId === selectedSite && 
            s.guardId === record.guardId
          );

          if (!currentShift) {
            skippedCount++;
            continue;
          }

          const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
            record.guardId, 
            formattedDate, 
            fromShift.type, 
            selectedSite
          );
          
          if (isMarkedElsewhere) {
            skippedCount++;
            continue;
          }

          const shiftType = fromShift.type;
          const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
          const currentSelected = selectedGuards[shiftType] || [];
          
          if (currentSelected.length >= maxSlots) {
            skippedCount++;
            continue;
          }

          const alreadyMarked = attendanceRecords.some(ar => 
            ar.guardId === record.guardId && 
            ar.status === 'present' &&
            shifts.find(s => s.id === ar.shiftId)?.type === shiftType &&
            shifts.find(s => s.id === ar.shiftId)?.siteId === selectedSite
          );

          if (alreadyMarked) {
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
        toast.success(`Copied ${successCount} attendance records from ${format(fromDate, 'PPP')}`);
      }
      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} guards (not assigned, unavailable, or already marked)`);
      }
    } catch (error) {
      console.error('Error copying attendance:', error);
      toast.error('Failed to copy attendance');
    }
  };

  const handleResetAttendance = async () => {
    if (!selectedSite) {
      toast.error('Please select a site first');
      return;
    }

    try {
      const todayRecords = attendanceRecords.filter(record => {
        const shift = shifts.find(s => s.id === record.shiftId);
        return shift?.siteId === selectedSite && record.status === 'present';
      });

      if (todayRecords.length === 0) {
        toast.info('No attendance records to clear for today');
        return;
      }

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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setShiftFilter('all');
  };

  if (sitesLoading || guardsLoading || shiftsLoading || earningsLoading) {
    return <AttendanceMarkingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Management</CardTitle>
          <CardDescription>
            Mark attendance for guards assigned to site shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sites={sites}
            guards={guards}
            selectedSite={selectedSite}
            onSiteChange={setSelectedSite}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            shiftFilter={shiftFilter}
            onShiftFilterChange={setShiftFilter}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Date Selection and Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <QuickActions
            selectedSite={selectedSite}
            selectedDate={selectedDate}
            sites={sites}
            onCopyYesterday={() => handleCopyFromDate(subDays(selectedDate, 1))}
            onReset={handleResetAttendance}
            dayShiftCount={dayShiftGuards.length}
            nightShiftCount={nightShiftGuards.length}
            presentDayCount={presentDayGuards.length}
            presentNightCount={presentNightGuards.length}
            daySlots={daySlots}
            nightSlots={nightSlots}
            isLoading={markAttendanceMutation.isPending || deleteAttendanceMutation.isPending}
          />
        </div>
      </div>

      {/* Error States */}
      {!selectedSite && <NoSiteSelectedError />}

      {/* Bulk Operations */}
      {selectedSite && (
        <BulkOperations
          guards={guards}
          sites={sites}
          selectedDate={selectedDate}
          onBulkMarkAttendance={handleBulkMarkAttendance}
          onCopyFromDate={handleCopyFromDate}
          onResetAttendance={handleResetAttendance}
          selectedSite={selectedSite}
          dayShiftGuards={dayShiftGuards}
          nightShiftGuards={nightShiftGuards}
          presentDayGuards={presentDayGuards}
          presentNightGuards={presentNightGuards}
        />
      )}

      {/* Attendance Cards */}
      {selectedSite && (daySlots > 0 || nightSlots > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {daySlots > 0 && (
            <AttendanceSlotCard
              shiftType="day"
              title="Day Shift"
              assignedGuards={dayShiftGuards}
              selectedGuards={selectedGuards.day || []}
              onGuardSelect={(guardId) => handleGuardSelect(guardId, 'day')}
              onAddGuard={() => {/* handle add guard */}}
              onToggleExpansion={() => {
                setExpandedCards({
                  ...expandedCards,
                  day: !expandedCards.day
                });
              }}
              isExpanded={expandedCards.day}
              payRatePerShift={payRatePerShift}
              unavailableGuards={[]}
            />
          )}

          {nightSlots > 0 && (
            <AttendanceSlotCard
              shiftType="night"
              title="Night Shift"
              assignedGuards={nightShiftGuards}
              selectedGuards={selectedGuards.night || []}
              onGuardSelect={(guardId) => handleGuardSelect(guardId, 'night')}
              onAddGuard={() => {/* handle add guard */}}
              onToggleExpansion={() => {
                setExpandedCards({
                  ...expandedCards,
                  night: !expandedCards.night
                });
              }}
              isExpanded={expandedCards.night}
              payRatePerShift={payRatePerShift}
              unavailableGuards={[]}
            />
          )}
        </div>
      )}

      {/* Site Earnings Summary */}
      {selectedSite && siteEarnings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Monthly Earnings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Shifts</p>
                <p className="font-medium">{siteEarnings.totalShifts}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Allocated Amount</p>
                <p className="font-medium">{formatCurrency(siteEarnings.allocatedAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guard Costs</p>
                <p className="font-medium">{formatCurrency(siteEarnings.guardCosts)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Earnings</p>
                <p className={`font-medium ${
                  siteEarnings.netEarnings > 0 ? 'text-green-600' : 
                  siteEarnings.netEarnings < 0 ? 'text-red-600' : ''
                }`}>
                  {formatCurrency(siteEarnings.netEarnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceMarkingEnhanced;