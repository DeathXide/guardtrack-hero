import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Rocket, Calendar, Sun, Moon, Search, Building2,
  Users, UserCheck, UserX, Clock, TrendingUp, Filter, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { dailyAttendanceSlotsApi } from '@/lib/dailyAttendanceSlotsApi';
import type { SiteAttendanceSummary, BulkStartDayResult, ConflictInfo } from '@/lib/dailyAttendanceSlotsApi';
import SiteAttendanceRow from './SiteAttendanceRow';
import StartDayDialog from './StartDayDialog';
import ConflictBanner from './ConflictBanner';
import EnhancedGuardSelectionModal from './EnhancedGuardSelectionModal';
import TemporarySlotsManagementDialog from './TemporarySlotsManagementDialog';
import { guardsApi } from '@/lib/guardsApi';

interface AllSitesAttendanceDashboardProps {
  onViewSiteDetails?: (siteId: string) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

type FilterTab = 'all' | 'attention' | 'completed' | 'new';

const AllSitesAttendanceDashboard: React.FC<AllSitesAttendanceDashboardProps> = ({
  onViewSiteDetails,
  selectedDate: controlledDate,
  onDateChange,
}) => {
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const selectedDate = controlledDate ?? internalDate;
  const setSelectedDate = (date: Date) => {
    setInternalDate(date);
    onDateChange?.(date);
  };
  const [shiftFilter, setShiftFilter] = useState<'day' | 'night' | undefined>(undefined);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [gstTypeFilter, setGstTypeFilter] = useState<string | undefined>(undefined);
  const [startDayDialogOpen, setStartDayDialogOpen] = useState(false);
  const [startDayResult, setStartDayResult] = useState<BulkStartDayResult | null>(null);

  // Guard selection modal state
  const [guardModal, setGuardModal] = useState<{
    isOpen: boolean;
    slotId: string;
    shiftType: 'day' | 'night';
    roleType: string;
    siteId: string;
    isReplacement: boolean;
    originalGuardId?: string;
  }>({ isOpen: false, slotId: '', shiftType: 'day', roleType: '', siteId: '', isReplacement: false });

  // Temp slots dialog state
  const [tempSlotsDialog, setTempSlotsDialog] = useState<{ isOpen: boolean; siteId: string }>({ isOpen: false, siteId: '' });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Fetch all sites attendance summary
  const { data: summaries = [], isLoading: summariesLoading, error: summariesError } = useQuery({
    queryKey: ['all-sites-attendance', dateString, shiftFilter],
    queryFn: () => dailyAttendanceSlotsApi.getAllSitesAttendanceSummary(dateString, shiftFilter),
    staleTime: 0,
  });

  // Fetch conflicts
  const { data: conflicts = [] } = useQuery({
    queryKey: ['attendance-conflicts', dateString],
    queryFn: () => dailyAttendanceSlotsApi.detectConflicts(dateString),
  });

  // Log errors for debugging
  if (summariesError) {
    console.error('Attendance dashboard error:', summariesError);
  }

  // Fetch guards for the selection modal
  const { data: allGuards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: guardsApi.getAllGuards,
  });

  // Fetch temporary slots for the temp slots dialog
  const { data: temporarySlots = [] } = useQuery({
    queryKey: ['temporary-slots', tempSlotsDialog.siteId, dateString],
    queryFn: () => dailyAttendanceSlotsApi.getTemporarySlots(tempSlotsDialog.siteId, dateString),
    enabled: tempSlotsDialog.isOpen && !!tempSlotsDialog.siteId,
  });

  // Fetch guards assigned for the current shift (for the modal exclusion list)
  const { data: guardsAssignedForShift } = useQuery({
    queryKey: ['guards-assigned-shift', dateString, guardModal.shiftType],
    queryFn: () => dailyAttendanceSlotsApi.getGuardIdsAssignedForShift(dateString, guardModal.shiftType),
    enabled: guardModal.isOpen,
  });

  // Check if any extra filters are active
  const hasActiveFilters = gstTypeFilter !== undefined;

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalSites = summaries.length;
    const totalSlots = summaries.reduce((sum, s) => sum + s.totalSlots, 0);
    const totalPresent = summaries.reduce((sum, s) => sum + s.presentGuards, 0);
    const totalAbsent = summaries.reduce((sum, s) => sum + s.absentGuards, 0);
    const totalPending = summaries.reduce((sum, s) => sum + s.pendingSlots, 0);
    const totalAssigned = summaries.reduce((sum, s) => sum + s.assignedSlots, 0);
    const attendanceRate = totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 0;
    return { totalSites, totalSlots, totalPresent, totalAbsent, totalPending, totalAssigned, attendanceRate };
  }, [summaries]);

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    let filtered = summaries;

    // GST type filter
    if (gstTypeFilter) {
      filtered = filtered.filter(s => s.gstType === gstTypeFilter);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.siteName.toLowerCase().includes(term) ||
        s.organizationName.toLowerCase().includes(term) ||
        s.address.toLowerCase().includes(term)
      );
    }

    // Tab filter
    switch (filterTab) {
      case 'attention':
        filtered = filtered.filter(s =>
          s.pendingSlots > 0 || s.absentGuards > 0 || s.unfilledSlots > 0
        );
        break;
      case 'completed':
        filtered = filtered.filter(s =>
          s.totalSlots > 0 && s.presentGuards === s.assignedSlots && s.unfilledSlots === 0
        );
        break;
      case 'new':
        filtered = filtered.filter(s =>
          s.totalSlots === 0 && s.hasStaffingRequirements
        );
        break;
    }

    return filtered;
  }, [summaries, searchTerm, filterTab, gstTypeFilter]);

  // Pre-filter by GST type before computing tab counts (so counts reflect active filter)
  const baseFiltered = useMemo(() => {
    if (!gstTypeFilter) return summaries;
    return summaries.filter(s => s.gstType === gstTypeFilter);
  }, [summaries, gstTypeFilter]);

  // Filter counts for tab badges
  const filterCounts = useMemo(() => ({
    all: baseFiltered.length,
    attention: baseFiltered.filter(s => s.pendingSlots > 0 || s.absentGuards > 0 || s.unfilledSlots > 0).length,
    completed: baseFiltered.filter(s => s.totalSlots > 0 && s.presentGuards === s.assignedSlots && s.unfilledSlots === 0).length,
    new: baseFiltered.filter(s => s.totalSlots === 0 && s.hasStaffingRequirements).length,
  }), [baseFiltered]);

  // Check if day already has some slots
  const dayAlreadyStarted = summaries.some(s => s.totalSlots > 0);

  // Mutations
  const startDayMutation = useMutation({
    mutationFn: () => dailyAttendanceSlotsApi.bulkStartDay(dateString),
    onSuccess: (result) => {
      setStartDayResult(result);
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({
        title: 'Day started successfully',
        description: `${result.sitesProcessed} sites processed, ${result.guardsMarkedPresent} guards marked present`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error starting day', description: error.message, variant: 'destructive' });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ slotId, isPresent }: { slotId: string; isPresent: boolean }) =>
      dailyAttendanceSlotsApi.markAttendance(slotId, isPresent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
    },
  });

  const markAllPresentForSiteMutation = useMutation({
    mutationFn: (siteId: string) =>
      dailyAttendanceSlotsApi.markAllPresentForSite(siteId, dateString, shiftFilter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'All guards marked present for site' });
    },
  });

  const resolveConflictMutation = useMutation({
    mutationFn: ({ guardId, shiftType, keepAtSiteId }: { guardId: string; shiftType: 'day' | 'night'; keepAtSiteId: string }) =>
      dailyAttendanceSlotsApi.resolveConflict(guardId, dateString, shiftType, keepAtSiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      toast({ title: 'Conflict resolved' });
    },
  });

  const assignGuardMutation = useMutation({
    mutationFn: ({ slotId, guardId, isReplacement }: { slotId: string; guardId: string; isReplacement: boolean }) =>
      isReplacement
        ? dailyAttendanceSlotsApi.replaceGuardInSlot(slotId, guardId)
        : dailyAttendanceSlotsApi.assignGuardToSlot(slotId, guardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['guards-assigned-shift'] });
      setGuardModal(prev => ({ ...prev, isOpen: false }));
      toast({ title: 'Guard assigned successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error assigning guard', description: error.message, variant: 'destructive' });
    },
  });

  const unassignGuardMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.unassignGuardFromSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['guards-assigned-shift'] });
      toast({ title: 'Guard unassigned' });
    },
    onError: (error: any) => {
      toast({ title: 'Error unassigning guard', description: error.message, variant: 'destructive' });
    },
  });

  // Guard modal helpers - return ALL active guards (modal will show assigned-elsewhere info)
  const getActiveGuards = () => {
    return allGuards.filter(g => g.status === 'active');
  };

  const handleOpenStartDay = () => {
    setStartDayResult(null);
    setStartDayDialogOpen(true);
  };

  const handleAssignGuard = (slotId: string, shiftType: 'day' | 'night', roleType: string, siteId: string) => {
    setGuardModal({ isOpen: true, slotId, shiftType, roleType, siteId, isReplacement: false });
  };

  const handleReplaceGuard = (slotId: string, shiftType: 'day' | 'night', roleType: string, guardId: string, siteId: string) => {
    setGuardModal({ isOpen: true, slotId, shiftType, roleType, siteId, isReplacement: true, originalGuardId: guardId });
  };

  const handleViewDetails = (siteId: string) => {
    if (onViewSiteDetails) {
      onViewSiteDetails(siteId);
    }
  };

  const handleManageTempSlots = (siteId: string) => {
    setTempSlotsDialog({ isOpen: true, siteId });
  };

  const statCards = [
    { icon: Building2, label: 'Sites', value: aggregateStats.totalSites, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800' },
    { icon: Users, label: 'Total Slots', value: aggregateStats.totalSlots, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-200 dark:border-indigo-800' },
    { icon: UserCheck, label: 'Present', value: aggregateStats.totalPresent, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800' },
    { icon: UserX, label: 'Absent', value: aggregateStats.totalAbsent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-800' },
    { icon: Clock, label: 'Pending', value: aggregateStats.totalPending, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800' },
    {
      icon: TrendingUp,
      label: 'Rate',
      value: `${aggregateStats.attendanceRate}%`,
      color: aggregateStats.attendanceRate >= 80 ? 'text-green-600' : aggregateStats.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600',
      bg: aggregateStats.attendanceRate >= 80 ? 'bg-green-50 dark:bg-green-950/20' : aggregateStats.attendanceRate >= 60 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-red-50 dark:bg-red-950/20',
      border: aggregateStats.attendanceRate >= 80 ? 'border-green-200 dark:border-green-800' : aggregateStats.attendanceRate >= 60 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800',
    },
  ];

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="text-sm text-muted-foreground">Manage attendance across all sites</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Shift Filter */}
            <div className="flex items-center border rounded-md">
              <Button
                size="sm"
                variant={!shiftFilter ? 'default' : 'ghost'}
                onClick={() => setShiftFilter(undefined)}
                className="rounded-r-none h-10 px-4 text-sm"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={shiftFilter === 'day' ? 'default' : 'ghost'}
                onClick={() => setShiftFilter('day')}
                className="rounded-none h-10 px-4 text-sm gap-1.5 border-x"
              >
                <Sun className="h-4 w-4" /> Day
              </Button>
              <Button
                size="sm"
                variant={shiftFilter === 'night' ? 'default' : 'ghost'}
                onClick={() => setShiftFilter('night')}
                className="rounded-l-none h-10 px-4 text-sm gap-1.5"
              >
                <Moon className="h-4 w-4" /> Night
              </Button>
            </div>

            {/* Start Day Button */}
            <Button onClick={handleOpenStartDay} disabled={startDayMutation.isPending} className="gap-2">
              <Rocket className="h-4 w-4" />
              Start Day
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className={`${stat.bg} ${stat.border}`}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                      <p className={`text-xl md:text-2xl font-bold ${stat.color} mt-0.5`}>{stat.value}</p>
                    </div>
                    <Icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Conflict Banner */}
        <ConflictBanner
          conflicts={conflicts}
          onResolve={(guardId, shiftType, keepAtSiteId) =>
            resolveConflictMutation.mutate({ guardId, shiftType, keepAtSiteId })
          }
          isLoading={resolveConflictMutation.isPending}
        />

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11"
              />
            </div>

            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)} className="w-auto">
              <TabsList className="h-11">
                <TabsTrigger value="all" className="text-sm h-9 px-4">
                  All ({filterCounts.all})
                </TabsTrigger>
                <TabsTrigger value="attention" className="text-sm h-9 px-4">
                  Needs Attention ({filterCounts.attention})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-sm h-9 px-4">
                  Completed ({filterCounts.completed})
                </TabsTrigger>
                {filterCounts.new > 0 && (
                  <TabsTrigger value="new" className="text-sm h-9 px-4">
                    New ({filterCounts.new})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          {/* GST Type & Organization Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* GST Type Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                size="sm"
                variant={!gstTypeFilter ? 'default' : 'ghost'}
                onClick={() => setGstTypeFilter(undefined)}
                className="rounded-r-none h-10 px-4 text-sm"
              >
                All Types
              </Button>
              <Button
                size="sm"
                variant={gstTypeFilter === 'GST' ? 'default' : 'ghost'}
                onClick={() => setGstTypeFilter('GST')}
                className="rounded-none h-10 px-4 text-sm border-x"
              >
                GST
              </Button>
              <Button
                size="sm"
                variant={gstTypeFilter === 'NGST' ? 'default' : 'ghost'}
                onClick={() => setGstTypeFilter('NGST')}
                className="rounded-none h-10 px-4 text-sm border-r"
              >
                NGST
              </Button>
              <Button
                size="sm"
                variant={gstTypeFilter === 'RCM' ? 'default' : 'ghost'}
                onClick={() => setGstTypeFilter('RCM')}
                className="rounded-none h-10 px-4 text-sm border-r"
              >
                RCM
              </Button>
              <Button
                size="sm"
                variant={gstTypeFilter === 'PERSONAL' ? 'default' : 'ghost'}
                onClick={() => setGstTypeFilter('PERSONAL')}
                className="rounded-l-none h-10 px-4 text-sm"
              >
                Personal
              </Button>
            </div>

            {/* Clear Filter */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGstTypeFilter(undefined)}
                className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground gap-1.5"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Site List */}
        {summariesError ? (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="py-8 text-center">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Error loading attendance data</p>
              <p className="text-xs text-red-600 dark:text-red-400">{(summariesError as any)?.message || 'Unknown error'}</p>
            </CardContent>
          </Card>
        ) : summariesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-48" />
                  <div className="flex-1" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No sites match your search' : 'No sites found for this filter'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSummaries.map(site => (
              <SiteAttendanceRow
                key={site.siteId}
                site={site}
                onMarkAttendance={(slotId, isPresent) =>
                  markAttendanceMutation.mutate({ slotId, isPresent })
                }
                onAssignGuard={handleAssignGuard}
                onReplaceGuard={handleReplaceGuard}
                onUnassignGuard={(slotId) => unassignGuardMutation.mutate(slotId)}
                onMarkAllPresent={(siteId) => markAllPresentForSiteMutation.mutate(siteId)}
                onViewDetails={handleViewDetails}
                onManageTempSlots={handleManageTempSlots}
                isLoading={markAttendanceMutation.isPending || assignGuardMutation.isPending || unassignGuardMutation.isPending}
                defaultExpanded={
                  filterTab === 'attention' &&
                  (site.pendingSlots > 0 || site.absentGuards > 0 || site.unfilledSlots > 0)
                }
              />
            ))}
          </div>
        )}

        {/* Start Day Dialog */}
        <StartDayDialog
          isOpen={startDayDialogOpen}
          onClose={() => setStartDayDialogOpen(false)}
          onConfirm={() => startDayMutation.mutate()}
          isLoading={startDayMutation.isPending}
          result={startDayResult}
          totalSites={aggregateStats.totalSites}
          dateLabel={format(selectedDate, 'EEEE, MMMM d, yyyy')}
          alreadyStarted={dayAlreadyStarted}
        />

        {/* Guard Selection Modal */}
        <EnhancedGuardSelectionModal
          isOpen={guardModal.isOpen}
          onClose={() => setGuardModal(prev => ({ ...prev, isOpen: false }))}
          guards={getActiveGuards()}
          onGuardSelect={(guardId) =>
            assignGuardMutation.mutate({
              slotId: guardModal.slotId,
              guardId,
              isReplacement: guardModal.isReplacement,
            })
          }
          title={guardModal.isReplacement ? 'Replace Guard' : 'Assign Guard'}
          excludeGuardIds={guardModal.originalGuardId ? [guardModal.originalGuardId] : []}
          preferredRole={guardModal.roleType}
          assignedElsewhere={guardsAssignedForShift || new Map()}
        />

        {/* Temporary Slots Management Dialog */}
        <TemporarySlotsManagementDialog
          isOpen={tempSlotsDialog.isOpen}
          onClose={() => setTempSlotsDialog({ isOpen: false, siteId: '' })}
          siteId={tempSlotsDialog.siteId}
          date={dateString}
          temporarySlots={temporarySlots}
        />
      </div>
    </TooltipProvider>
  );
};

export default AllSitesAttendanceDashboard;
