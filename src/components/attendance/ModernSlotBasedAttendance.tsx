import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar, ArrowLeft, AlertCircle, Sun, Moon, Search,
  Copy, RefreshCw, Clock, CheckCircle, Users, Loader2,
} from 'lucide-react';
import { m, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { sitesApi } from '@/lib/sitesApi';
import { guardsApi } from '@/lib/guardsApi';
import { dailyAttendanceSlotsApi, DailyAttendanceSlot } from '@/lib/dailyAttendanceSlotsApi';
import AttendanceStatsCards from './AttendanceStatsCards';
import ModernSlotCard from './ModernSlotCard';
import EnhancedGuardSelectionModal from './EnhancedGuardSelectionModal';
import TemporarySlotsManagementDialog from './TemporarySlotsManagementDialog';

interface ModernSlotBasedAttendanceProps {
  preselectedSiteId?: string;
  initialDate?: Date;
  onBack?: () => void;
  onDateChange?: (date: Date) => void;
}

const ModernSlotBasedAttendance: React.FC<ModernSlotBasedAttendanceProps> = ({
  preselectedSiteId,
  initialDate,
  onBack,
  onDateChange,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? new Date());
  const [selectedSite, setSelectedSite] = useState<string>(preselectedSiteId ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeShift, setActiveShift] = useState<'all' | 'day' | 'night'>('all');
  const [temporarySlotsDialog, setTemporarySlotsDialog] = useState(false);

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
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Sync preselected site
  useEffect(() => {
    if (preselectedSiteId) setSelectedSite(preselectedSiteId);
  }, [preselectedSiteId]);

  // Propagate date changes to parent
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  };

  // ─── Data Fetching ────────────────────────────────────────────

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites,
  });

  const { data: guards = [] } = useQuery({
    queryKey: ['guards'],
    queryFn: guardsApi.getAllGuards,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['daily-slots', selectedSite, dateString],
    queryFn: () => selectedSite
      ? dailyAttendanceSlotsApi.generateSlotsForDate(selectedSite, dateString)
      : [],
    enabled: !!selectedSite,
    staleTime: 0,
  });

  const { data: temporarySlots = [] } = useQuery({
    queryKey: ['temporary-slots', selectedSite, dateString],
    queryFn: () => selectedSite
      ? dailyAttendanceSlotsApi.getTemporarySlots(selectedSite, dateString)
      : [],
    enabled: !!selectedSite,
  });

  // Fetch guards assigned for the current shift (for modal assigned-elsewhere info)
  const { data: guardsAssignedForShift } = useQuery({
    queryKey: ['guards-assigned-shift', dateString, allocationModal.shiftType],
    queryFn: () => dailyAttendanceSlotsApi.getGuardIdsAssignedForShift(dateString, allocationModal.shiftType),
    enabled: allocationModal.isOpen,
  });

  // ─── Derived State ────────────────────────────────────────────

  const currentSite = useMemo(() => sites.find(s => s.id === selectedSite), [sites, selectedSite]);

  const { filteredSlots, uniqueRoles, shiftCounts } = useMemo(() => {
    let filtered = slots;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(slot => {
        const guard = guards.find(g => g.id === slot.assigned_guard_id);
        return (
          slot.role_type.toLowerCase().includes(term) ||
          slot.slot_number.toString().includes(term) ||
          (guard && guard.name.toLowerCase().includes(term)) ||
          (guard && guard.badge_number.toLowerCase().includes(term))
        );
      });
    }

    if (roleFilter !== 'all') filtered = filtered.filter(s => s.role_type === roleFilter);

    if (statusFilter !== 'all') {
      filtered = filtered.filter(slot => {
        switch (statusFilter) {
          case 'assigned': return slot.assigned_guard_id && slot.is_present === null;
          case 'present': return slot.is_present === true;
          case 'absent': return slot.is_present === false;
          case 'empty': return !slot.assigned_guard_id;
          default: return true;
        }
      });
    }

    if (activeShift !== 'all') filtered = filtered.filter(s => s.shift_type === activeShift);

    return {
      filteredSlots: filtered,
      uniqueRoles: Array.from(new Set(slots.map(s => s.role_type))) as string[],
      shiftCounts: {
        day: slots.filter(s => s.shift_type === 'day').length,
        night: slots.filter(s => s.shift_type === 'night').length,
        all: slots.length,
      },
    };
  }, [slots, guards, searchTerm, roleFilter, statusFilter, activeShift]);

  const groupedSlots = useMemo(() => {
    const grouped: Record<string, Record<string, DailyAttendanceSlot[]>> = { day: {}, night: {} };
    filteredSlots.forEach(slot => {
      if (!grouped[slot.shift_type][slot.role_type]) grouped[slot.shift_type][slot.role_type] = [];
      grouped[slot.shift_type][slot.role_type].push(slot);
    });
    return grouped;
  }, [filteredSlots]);

  const allGuardsAssigned = useMemo(() => {
    if (slots.length === 0) return false;
    const assigned = slots.filter(s => s.assigned_guard_id);
    const pending = slots.filter(s => s.assigned_guard_id && s.is_present === null);
    return assigned.length === slots.length && pending.length > 0;
  }, [slots]);

  // ─── Shared invalidation helper ──────────────────────────────

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
    queryClient.invalidateQueries({ queryKey: ['all-sites-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-conflicts'] });
    queryClient.invalidateQueries({ queryKey: ['guards-assigned-shift'] });
  };

  // ─── Mutations ────────────────────────────────────────────────

  const assignGuardMutation = useMutation({
    mutationFn: ({ slotId, guardId, isReplacement }: { slotId: string; guardId: string; isReplacement?: boolean }) =>
      isReplacement
        ? dailyAttendanceSlotsApi.replaceGuardInSlot(slotId, guardId)
        : dailyAttendanceSlotsApi.assignGuardToSlot(slotId, guardId),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Guard assigned successfully' });
      setAllocationModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      toast({ title: 'Error assigning guard', description: error.message, variant: 'destructive' });
    },
  });

  const unassignGuardMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.unassignGuardFromSlot(slotId),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Guard unassigned' });
    },
    onError: (error: any) => {
      toast({ title: 'Error unassigning guard', description: error.message, variant: 'destructive' });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ slotId, isPresent }: { slotId: string; isPresent: boolean }) =>
      dailyAttendanceSlotsApi.markAttendance(slotId, isPresent),
    onSuccess: () => {
      invalidateAll();
    },
  });

  const copyPreviousDayMutation = useMutation({
    mutationFn: () => {
      const previousDate = format(new Date(selectedDate.getTime() - 86400000), 'yyyy-MM-dd');
      return dailyAttendanceSlotsApi.copySlotsFromPreviousDay(selectedSite, dateString, previousDate);
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ title: 'Copied from previous day', description: 'Assigned guards marked as present automatically' });
    },
    onError: (error: any) => {
      toast({ title: 'Error copying slots', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateSlotsMutation = useMutation({
    mutationFn: () => {
      if (!selectedSite) throw new Error('No site selected');
      return dailyAttendanceSlotsApi.regenerateSlotsForDate(selectedSite, dateString);
    },
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ title: 'Slots refreshed', description: 'Updated based on current site requirements' });
    },
    onError: (error: any) => {
      toast({ title: 'Error refreshing slots', description: error.message, variant: 'destructive' });
    },
  });

  const markAllPresentMutation = useMutation({
    mutationFn: () => dailyAttendanceSlotsApi.markAllPresentForSite(selectedSite, dateString),
    onSuccess: (count) => {
      invalidateAll();
      toast({ title: 'All guards marked present', description: `${count} guard(s) updated` });
    },
    onError: (error: any) => {
      toast({ title: 'Error marking attendance', description: error.message, variant: 'destructive' });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────

  const handleOpenAllocation = (slotId: string, shiftType: 'day' | 'night', roleType: string, isReplacement = false, originalGuardId?: string) => {
    setAllocationModal({ isOpen: true, slotId, shiftType, roleType, isReplacement, originalGuardId });
  };

  const getActiveGuards = () => guards.filter(g => g.status === 'active');

  const anyMutationPending = assignGuardMutation.isPending || unassignGuardMutation.isPending || markAttendanceMutation.isPending;

  // ─── Render Helpers ───────────────────────────────────────────

  const renderShiftSection = (shiftType: 'day' | 'night') => {
    const shiftSlots = groupedSlots[shiftType];
    const totalInShift = Object.values(shiftSlots).flat().length;
    if (totalInShift === 0) return null;

    const ShiftIcon = shiftType === 'day' ? Sun : Moon;
    const shiftLabel = shiftType === 'day' ? 'Day Shift' : 'Night Shift';

    return (
      <m.div
        key={shiftType}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
          <div className={`p-2 rounded-lg ${
            shiftType === 'day'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30'
              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30'
          }`}>
            <ShiftIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{shiftLabel}</h3>
            <p className="text-sm text-muted-foreground">{totalInShift} slot{totalInShift !== 1 ? 's' : ''}</p>
          </div>
          <Badge variant="secondary" className="ml-auto">{totalInShift}</Badge>
        </div>

        {Object.entries(shiftSlots).map(([roleType, roleSlots]) => (
          <div key={`${shiftType}-${roleType}`} className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{roleType}</h4>
              <Badge variant="outline" className="text-xs">{roleSlots.length}</Badge>
            </div>
            <m.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {roleSlots.map(slot => {
                const assignedGuard = guards.find(g => g.id === slot.assigned_guard_id);
                return (
                  <m.div
                    key={slot.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <ModernSlotCard
                      slot={slot}
                      assignedGuard={assignedGuard}
                      onAssignGuard={handleOpenAllocation}
                      onUnassignGuard={(id) => unassignGuardMutation.mutate(id)}
                      onReplaceGuard={(id, st, rt, gid) => handleOpenAllocation(id, st, rt, true, gid)}
                      onMarkAttendance={(id, p) => markAttendanceMutation.mutate({ slotId: id, isPresent: p })}
                      isLoading={anyMutationPending}
                    />
                  </m.div>
                );
              })}
            </m.div>
          </div>
        ))}
      </m.div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {currentSite?.site_name ?? 'Site Attendance'}
              </h1>
              {currentSite && (
                <p className="text-sm text-muted-foreground">
                  {currentSite.organization_name}{currentSite.address ? ` · ${currentSite.address}` : ''}
                </p>
              )}
            </div>
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
                  onSelect={(d) => d && handleDateChange(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Site selector only when no preselected site */}
            {!preselectedSiteId && (
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.site_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </m.div>

        {selectedSite && (
          <AnimatePresence mode="wait">
            <m.div
              key={`${selectedSite}-${dateString}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* ── Stats ──────────────────────────────────────── */}
              <AttendanceStatsCards slots={slots} />

              {/* ── Inline Action Bar ──────────────────────────── */}
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyPreviousDayMutation.mutate()}
                      disabled={copyPreviousDayMutation.isPending}
                      className="h-10 gap-1.5 text-sm active:bg-muted"
                    >
                      {copyPreviousDayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      Copy Yesterday
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy slots and guards from previous day</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateSlotsMutation.mutate()}
                      disabled={regenerateSlotsMutation.isPending}
                      className="h-10 gap-1.5 text-sm active:bg-muted"
                    >
                      {regenerateSlotsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Refresh Slots
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate slots from current staffing requirements</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTemporarySlotsDialog(true)}
                      className="h-10 gap-1.5 text-sm text-amber-700 border-amber-200 hover:bg-amber-50 active:bg-amber-100 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950"
                    >
                      <Clock className="h-4 w-4" />
                      Temp Slots
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage temporary slots for this date</TooltipContent>
                </Tooltip>

                {/* Spacer pushes Mark All to the right */}
                <div className="flex-1" />

                {allGuardsAssigned && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => markAllPresentMutation.mutate()}
                        disabled={markAllPresentMutation.isPending}
                        className="h-10 gap-1.5 text-sm bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                      >
                        {markAllPresentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Mark All Present
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark all assigned guards as present</TooltipContent>
                  </Tooltip>
                )}
              </m.div>

              {/* ── Filters ────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search slots, guards, or roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[160px] h-11 text-sm">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] h-11 text-sm">
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

              {/* ── Slot Grid ──────────────────────────────────── */}
              {slotsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-8" />
                          <Skeleton className="h-8" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <m.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="py-8">
                      <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-medium">No slots found for this date</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Click "Refresh Slots" above to generate slots based on current staffing requirements.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              ) : (
                <Tabs value={activeShift} onValueChange={(v) => setActiveShift(v as 'all' | 'day' | 'night')} className="space-y-6">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="all" className="text-sm">All ({shiftCounts.all})</TabsTrigger>
                    <TabsTrigger value="day" className="text-sm gap-1">
                      <Sun className="h-3.5 w-3.5" /> Day ({shiftCounts.day})
                    </TabsTrigger>
                    <TabsTrigger value="night" className="text-sm gap-1">
                      <Moon className="h-3.5 w-3.5" /> Night ({shiftCounts.night})
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
            </m.div>
          </AnimatePresence>
        )}

        {/* ── Guard Selection Modal ──────────────────────────── */}
        <EnhancedGuardSelectionModal
          isOpen={allocationModal.isOpen}
          onClose={() => setAllocationModal(prev => ({ ...prev, isOpen: false }))}
          guards={getActiveGuards()}
          onGuardSelect={(guardId) =>
            assignGuardMutation.mutate({
              slotId: allocationModal.slotId,
              guardId,
              isReplacement: allocationModal.isReplacement,
            })
          }
          title={allocationModal.isReplacement ? 'Replace Guard' : 'Assign Guard'}
          excludeGuardIds={allocationModal.originalGuardId ? [allocationModal.originalGuardId] : []}
          preferredRole={allocationModal.roleType}
          assignedElsewhere={guardsAssignedForShift || new Map()}
        />

        {/* ── Temporary Slots Dialog ─────────────────────────── */}
        <TemporarySlotsManagementDialog
          isOpen={temporarySlotsDialog}
          onClose={() => setTemporarySlotsDialog(false)}
          siteId={selectedSite}
          date={dateString}
          temporarySlots={temporarySlots}
        />
      </div>
    </TooltipProvider>
  );
};

export default ModernSlotBasedAttendance;
