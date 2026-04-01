import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth } from 'date-fns';
import { useCallback } from 'react';

export interface SiteCoverage {
  id: string;
  name: string;
  org: string;
  gstType: string | null;
  dayTotal: number;
  dayAssigned: number;
  dayPresent: number;
  nightTotal: number;
  nightAssigned: number;
  nightPresent: number;
  totalSlots: number;
  hasSlots: boolean;
}

export interface DashboardAlert {
  type: 'absent' | 'understaffed' | 'leave';
  guardName?: string;
  siteName?: string;
  shiftType?: string;
  coverage?: number;
  unfilled?: number;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
}

export interface TrendPoint {
  date: string;
  label: string;
  present: number;
  assigned: number;
  total: number;
  rate: number;
}

// ── Shared cache config ──
// gcTime: how long unused cache entries survive after all subscribers unmount.
// staleTime: how long data is considered fresh (no background refetch).
const CACHE_30_MIN = 30 * 60 * 1000;
const STALE_10_MIN = 10 * 60 * 1000;
const STALE_5_MIN  = 5 * 60 * 1000;

// ── Query definitions (reusable for prefetch) ──
function todayStr()     { return format(new Date(), 'yyyy-MM-dd'); }
function monthStartStr(){ return format(startOfMonth(new Date()), 'yyyy-MM-dd'); }
function weekAgoStr()   { return format(subDays(new Date(), 6), 'yyyy-MM-dd'); }

const queryDefs = {
  guards: () => ({
    queryKey: ['dashboard', 'guards'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guards')
        .select('id, name, status, staff_role, guard_type, uniform_issued');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_10_MIN,
    gcTime: CACHE_30_MIN,
    refetchOnWindowFocus: false,
  }),

  sites: () => ({
    queryKey: ['dashboard', 'sites'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, site_name, organization_name, status, gst_type, staffing_requirements(id, role_type, day_slots, night_slots, budget_per_slot)');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_10_MIN,
    gcTime: CACHE_30_MIN,
    refetchOnWindowFocus: false,
  }),

  todaySlots: () => {
    const today = todayStr();
    return {
      queryKey: ['dashboard', 'slots', today] as const,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('daily_attendance_slots')
          .select('id, site_id, shift_type, role_type, slot_number, assigned_guard_id, is_present, pay_rate, guards(id, name, badge_number)')
          .eq('attendance_date', today);
        if (error) throw error;
        return data || [];
      },
      staleTime: STALE_5_MIN,
      gcTime: CACHE_30_MIN,
      refetchOnWindowFocus: false,
    };
  },

  invoices: () => {
    const monthStart = monthStartStr();
    return {
      queryKey: ['dashboard', 'invoices', monthStart] as const,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, invoice_date, site_name')
          .gte('invoice_date', monthStart)
          .order('invoice_date', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: STALE_10_MIN,
      gcTime: CACHE_30_MIN,
      refetchOnWindowFocus: false,
    };
  },

  weekTrend: () => {
    const today = todayStr();
    const weekAgo = weekAgoStr();
    return {
      queryKey: ['dashboard', 'trend', weekAgo, today] as const,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('daily_attendance_slots')
          .select('attendance_date, is_present, assigned_guard_id')
          .gte('attendance_date', weekAgo)
          .lte('attendance_date', today);
        if (error) throw error;
        return data || [];
      },
      staleTime: STALE_10_MIN,
      gcTime: CACHE_30_MIN,
      refetchOnWindowFocus: false,
    };
  },

  leaves: () => ({
    queryKey: ['dashboard', 'leaves', 'pending'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('id, status, employee_id, start_date, end_date, leave_type, reason, guards:employee_id(name)')
        .eq('status', 'pending');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_10_MIN,
    gcTime: CACHE_30_MIN,
    refetchOnWindowFocus: false,
  }),
};

// ── Prefetch: warm the cache before the user reaches the dashboard ──
export function usePrefetchDashboard() {
  const qc = useQueryClient();
  return useCallback(() => {
    // prefetchQuery only fetches if data is missing or stale — no redundant work.
    qc.prefetchQuery(queryDefs.guards());
    qc.prefetchQuery(queryDefs.sites());
    qc.prefetchQuery(queryDefs.todaySlots());
    qc.prefetchQuery(queryDefs.invoices());
    qc.prefetchQuery(queryDefs.weekTrend());
    qc.prefetchQuery(queryDefs.leaves());
  }, [qc]);
}

// ── Main hook ──
export function useDashboardData() {
  const today = todayStr();

  // Each query loads independently — fast ones render first.
  const guardsQ   = useQuery(queryDefs.guards());
  const sitesQ    = useQuery(queryDefs.sites());
  const slotsQ    = useQuery(queryDefs.todaySlots());
  const invoicesQ = useQuery(queryDefs.invoices());
  const trendQ    = useQuery(queryDefs.weekTrend());
  const leavesQ   = useQuery(queryDefs.leaves());

  const guards        = guardsQ.data   ?? [];
  const sites         = sitesQ.data    ?? [];
  const todaySlots    = slotsQ.data    ?? [];
  const monthInvoices = invoicesQ.data ?? [];
  const weekSlots     = trendQ.data    ?? [];
  const pendingLeaves = leavesQ.data   ?? [];

  // Per-section loading (true only on first load — stale data shows instantly).
  const kpiLoading   = guardsQ.isLoading || sitesQ.isLoading || slotsQ.isLoading;
  const sitesLoading = sitesQ.isLoading || slotsQ.isLoading;
  const alertsLoading = slotsQ.isLoading || sitesQ.isLoading || leavesQ.isLoading;
  const trendLoading  = trendQ.isLoading;
  const staffChartLoading  = guardsQ.isLoading;
  const invoiceLoading     = invoicesQ.isLoading;

  // Background refetch indicator (data shown, but refreshing in background).
  const isRefetching = guardsQ.isFetching || sitesQ.isFetching || slotsQ.isFetching
    || invoicesQ.isFetching || trendQ.isFetching || leavesQ.isFetching;

  // --- Guard stats ---
  const activeGuards     = guards.filter(g => g.status === 'active').length;
  const inactiveGuards   = guards.filter(g => g.status === 'inactive').length;
  const terminatedGuards = guards.filter(g => g.status === 'terminated' || g.status === 'resigned').length;

  const staffByRole = guards
    .filter(g => g.status === 'active')
    .reduce((acc, g) => {
      const role = g.staff_role || 'Security Guard';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const guardsWithUniform = guards.filter(g => g.status === 'active' && g.uniform_issued).length;

  // --- Site stats ---
  const activeSites = sites.filter(s => s.status === 'active').length;

  // --- Today's attendance ---
  const totalSlots   = todaySlots.length;
  const assignedSlots = todaySlots.filter(s => s.assigned_guard_id).length;
  const presentSlots  = todaySlots.filter(s => s.is_present === true).length;
  const absentSlots   = todaySlots.filter(s => s.is_present === false).length;
  const pendingSlots  = todaySlots.filter(s => s.assigned_guard_id && s.is_present === null).length;
  const unfilledSlots = todaySlots.filter(s => !s.assigned_guard_id).length;
  const attendanceRate = assignedSlots > 0 ? Math.round((presentSlots / assignedSlots) * 100) : 0;

  // --- Invoice stats ---
  const monthlyRevenue = monthInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const paidAmount = monthInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const pendingAmount = monthInvoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const invoiceCount = monthInvoices.length;
  const paidInvoices = monthInvoices.filter(i => i.status === 'paid').length;

  // --- Site coverage ---
  const siteCoverage: SiteCoverage[] = sites
    .filter(s => s.status === 'active')
    .map(site => {
      const siteSlots = todaySlots.filter(s => s.site_id === site.id);
      const daySlots  = siteSlots.filter(s => s.shift_type === 'day');
      const nightSlots = siteSlots.filter(s => s.shift_type === 'night');

      const requirements = (site as any).staffing_requirements || [];
      const expectedDay   = requirements.reduce((sum: number, r: any) => sum + (r.day_slots || 0), 0);
      const expectedNight = requirements.reduce((sum: number, r: any) => sum + (r.night_slots || 0), 0);

      return {
        id: site.id,
        name: site.site_name,
        org: site.organization_name,
        gstType: site.gst_type,
        dayTotal:    daySlots.length || expectedDay,
        dayAssigned: daySlots.filter(s => s.assigned_guard_id).length,
        dayPresent:  daySlots.filter(s => s.is_present === true).length,
        nightTotal:    nightSlots.length || expectedNight,
        nightAssigned: nightSlots.filter(s => s.assigned_guard_id).length,
        nightPresent:  nightSlots.filter(s => s.is_present === true).length,
        totalSlots: siteSlots.length,
        hasSlots: siteSlots.length > 0,
      };
    })
    .sort((a, b) => {
      if (a.hasSlots !== b.hasSlots) return a.hasSlots ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // --- Attendance trend (7 days) ---
  const attendanceTrend: TrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = weekSlots.filter(s => s.attendance_date === dateStr);
    const assigned = dayData.filter(s => s.assigned_guard_id).length;
    const present  = dayData.filter(s => s.is_present === true).length;
    const rate = assigned > 0 ? Math.round((present / assigned) * 100) : 0;

    attendanceTrend.push({
      date: dateStr,
      label: format(d, 'EEE'),
      present,
      assigned,
      total: dayData.length,
      rate,
    });
  }

  // --- Alerts ---
  const alerts: DashboardAlert[] = [];

  todaySlots
    .filter(s => s.is_present === false && s.assigned_guard_id)
    .forEach(slot => {
      const site  = sites.find(s => s.id === slot.site_id);
      const guard = (slot as any).guards;
      alerts.push({
        type: 'absent',
        guardName: guard?.name || 'Unknown Guard',
        siteName: site?.site_name || 'Unknown Site',
        shiftType: slot.shift_type,
      });
    });

  siteCoverage.forEach(site => {
    if (!site.hasSlots) return;
    const totalAssigned = site.dayAssigned + site.nightAssigned;
    const total = site.dayTotal + site.nightTotal;
    if (total > 0 && totalAssigned / total < 0.8) {
      alerts.push({
        type: 'understaffed',
        siteName: site.name,
        coverage: Math.round((totalAssigned / total) * 100),
        unfilled: total - totalAssigned,
      });
    }
  });

  pendingLeaves.forEach(leave => {
    const guardData = (leave as any).guards;
    alerts.push({
      type: 'leave',
      guardName: guardData?.name || 'Unknown',
      leaveType: leave.leave_type,
      startDate: leave.start_date,
      endDate: leave.end_date,
    });
  });

  return {
    today,
    // Per-section loading (first-load only — stale cache is shown instantly)
    kpiLoading,
    sitesLoading,
    alertsLoading,
    trendLoading,
    staffChartLoading,
    invoiceLoading,
    // Background refetch indicator
    isRefetching,
    // Guards
    totalGuards: guards.length,
    activeGuards,
    inactiveGuards,
    terminatedGuards,
    staffByRole,
    guardsWithUniform,
    // Sites
    totalSites: sites.length,
    activeSites,
    // Attendance
    totalSlots,
    assignedSlots,
    presentSlots,
    absentSlots,
    pendingSlots,
    unfilledSlots,
    attendanceRate,
    // Invoices
    monthlyRevenue,
    paidAmount,
    pendingAmount,
    invoiceCount,
    paidInvoices,
    monthInvoices,
    // Coverage
    siteCoverage,
    // Trend
    attendanceTrend,
    // Alerts
    alerts,
    pendingLeaves,
  };
}
