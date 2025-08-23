import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface MonthlyShiftSummary {
  guardId: string;
  guardName: string;
  month: string;
  totalDayShifts: number;
  totalNightShifts: number;
  totalShifts: number;
  attendanceRate: number; // percentage of assigned shifts actually worked
}

export interface GuardShiftDetails {
  guardId: string;
  guardName: string;
  badgeNumber: string;
  month: string;
  shifts: Array<{
    date: string;
    shiftType: 'day' | 'night';
    siteName: string;
    isPresent: boolean | null;
    wasAssigned: boolean;
  }>;
}

export const shiftTrackingApi = {
  // Get monthly shift summary for a specific guard
  async getGuardMonthlyShifts(guardId: string, month: string): Promise<MonthlyShiftSummary> {
    const startDate = startOfMonth(new Date(month + '-01'));
    const endDate = endOfMonth(startDate);
    
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        shift_type,
        is_present,
        assigned_guard_id,
        guards!inner(name, badge_number)
      `)
      .eq('assigned_guard_id', guardId)
      .gte('attendance_date', format(startDate, 'yyyy-MM-dd'))
      .lte('attendance_date', format(endDate, 'yyyy-MM-dd'));

    if (error) throw error;

    const dayShifts = data.filter(record => record.shift_type === 'day');
    const nightShifts = data.filter(record => record.shift_type === 'night');
    
    const totalDayShifts = dayShifts.filter(record => record.is_present === true).length;
    const totalNightShifts = nightShifts.filter(record => record.is_present === true).length;
    const totalShifts = totalDayShifts + totalNightShifts;
    
    const totalAssigned = data.length;
    const attendanceRate = totalAssigned > 0 ? (totalShifts / totalAssigned) * 100 : 0;
    
    const guardInfo = data[0]?.guards as any;
    
    return {
      guardId,
      guardName: guardInfo?.name || 'Unknown',
      month,
      totalDayShifts,
      totalNightShifts,
      totalShifts,
      attendanceRate: Math.round(attendanceRate * 100) / 100
    };
  },

  // Get detailed shift breakdown for a guard in a specific month
  async getGuardShiftDetails(guardId: string, month: string): Promise<GuardShiftDetails> {
    const startDate = startOfMonth(new Date(month + '-01'));
    const endDate = endOfMonth(startDate);
    
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        attendance_date,
        shift_type,
        is_present,
        assigned_guard_id,
        sites!inner(site_name),
        guards!inner(name, badge_number)
      `)
      .eq('assigned_guard_id', guardId)
      .gte('attendance_date', format(startDate, 'yyyy-MM-dd'))
      .lte('attendance_date', format(endDate, 'yyyy-MM-dd'))
      .order('attendance_date', { ascending: true });

    if (error) throw error;

    const guardInfo = data[0]?.guards as any;
    
    const shifts = data.map(record => ({
      date: record.attendance_date,
      shiftType: record.shift_type as 'day' | 'night',
      siteName: (record.sites as any)?.site_name || 'Unknown Site',
      isPresent: record.is_present,
      wasAssigned: true
    }));

    return {
      guardId,
      guardName: guardInfo?.name || 'Unknown',
      badgeNumber: guardInfo?.badge_number || 'Unknown',
      month,
      shifts
    };
  },

  // Get monthly shift summaries for all guards
  async getAllGuardsMonthlyShifts(month: string): Promise<MonthlyShiftSummary[]> {
    const startDate = startOfMonth(new Date(month + '-01'));
    const endDate = endOfMonth(startDate);
    
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        shift_type,
        is_present,
        assigned_guard_id,
        guards!inner(name, badge_number)
      `)
      .not('assigned_guard_id', 'is', null)
      .gte('attendance_date', format(startDate, 'yyyy-MM-dd'))
      .lte('attendance_date', format(endDate, 'yyyy-MM-dd'));

    if (error) throw error;

    // Group by guard ID
    const guardGroups = data.reduce((acc, record) => {
      const guardId = record.assigned_guard_id!;
      if (!acc[guardId]) {
        acc[guardId] = [];
      }
      acc[guardId].push(record);
      return acc;
    }, {} as Record<string, typeof data>);

    // Calculate summaries for each guard
    const summaries: MonthlyShiftSummary[] = Object.entries(guardGroups).map(([guardId, records]) => {
      const dayShifts = records.filter(record => record.shift_type === 'day');
      const nightShifts = records.filter(record => record.shift_type === 'night');
      
      const totalDayShifts = dayShifts.filter(record => record.is_present === true).length;
      const totalNightShifts = nightShifts.filter(record => record.is_present === true).length;
      const totalShifts = totalDayShifts + totalNightShifts;
      
      const totalAssigned = records.length;
      const attendanceRate = totalAssigned > 0 ? (totalShifts / totalAssigned) * 100 : 0;
      
      const guardInfo = records[0]?.guards as any;
      
      return {
        guardId,
        guardName: guardInfo?.name || 'Unknown',
        month,
        totalDayShifts,
        totalNightShifts,
        totalShifts,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      };
    });

    return summaries.sort((a, b) => b.totalShifts - a.totalShifts);
  },

  // Get shift performance analytics for a guard over multiple months
  async getGuardShiftTrends(guardId: string, months: string[]): Promise<MonthlyShiftSummary[]> {
    const trends: MonthlyShiftSummary[] = [];
    
    for (const month of months) {
      try {
        const summary = await this.getGuardMonthlyShifts(guardId, month);
        trends.push(summary);
      } catch (error) {
        console.error(`Error fetching shifts for ${month}:`, error);
        // Add empty data for missing months
        trends.push({
          guardId,
          guardName: 'Unknown',
          month,
          totalDayShifts: 0,
          totalNightShifts: 0,
          totalShifts: 0,
          attendanceRate: 0
        });
      }
    }
    
    return trends;
  }
};