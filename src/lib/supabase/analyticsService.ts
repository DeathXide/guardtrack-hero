import { supabase } from './client';

export interface AttendanceAnalytics {
  totalShifts: number;
  completedShifts: number;
  missedShifts: number;
  attendanceRate: number;
  punctualityRate: number;
}

export interface SiteAnalytics {
  totalGuards: number;
  activeGuards: number;
  totalShifts: number;
  completedShifts: number;
  earnings: number;
  costs: number;
  netProfit: number;
}

export interface GuardPerformance {
  guardId: string;
  guardName: string;
  totalShifts: number;
  completedShifts: number;
  missedShifts: number;
  lateShifts: number;
  attendanceRate: number;
  punctualityRate: number;
  earnings: number;
}

export class AnalyticsService {
  // Get attendance analytics for a date range
  async getAttendanceAnalytics(
    startDate: string,
    endDate: string,
    siteId?: string,
    guardId?: string
  ): Promise<AttendanceAnalytics> {
    const { data, error } = await supabase.rpc('get_attendance_analytics', {
      start_date: startDate,
      end_date: endDate,
      site_id: siteId,
      guard_id: guardId
    });

    if (error) throw error;

    return data || {
      totalShifts: 0,
      completedShifts: 0,
      missedShifts: 0,
      attendanceRate: 0,
      punctualityRate: 0
    };
  }

  // Get site performance analytics
  async getSiteAnalytics(siteId: string, month: string): Promise<SiteAnalytics> {
    const { data, error } = await supabase.rpc('get_site_analytics', {
      site_uuid: siteId,
      month_date: month
    });

    if (error) throw error;

    return data || {
      totalGuards: 0,
      activeGuards: 0,
      totalShifts: 0,
      completedShifts: 0,
      earnings: 0,
      costs: 0,
      netProfit: 0
    };
  }

  // Get guard performance metrics
  async getGuardPerformance(
    startDate: string,
    endDate: string,
    siteId?: string
  ): Promise<GuardPerformance[]> {
    const { data, error } = await supabase.rpc('get_guard_performance', {
      start_date: startDate,
      end_date: endDate,
      site_id: siteId
    });

    if (error) throw error;
    return data || [];
  }

  // Get daily attendance trends
  async getDailyAttendanceTrends(
    startDate: string,
    endDate: string,
    siteId?: string
  ) {
    const { data, error } = await supabase.rpc('get_daily_attendance_trends', {
      start_date: startDate,
      end_date: endDate,
      site_id: siteId
    });

    if (error) throw error;
    return data || [];
  }

  // Get monthly earnings breakdown
  async getMonthlyEarningsBreakdown(year: number, siteId?: string) {
    const { data, error } = await supabase.rpc('get_monthly_earnings_breakdown', {
      year_param: year,
      site_id: siteId
    });

    if (error) throw error;
    return data || [];
  }

  // Get attendance alerts (missed shifts, late arrivals, etc.)
  async getAttendanceAlerts(siteId?: string, limit = 50) {
    const { data, error } = await supabase.rpc('get_attendance_alerts', {
      site_id: siteId,
      limit_param: limit
    });

    if (error) throw error;
    return data || [];
  }

  // Get site utilization metrics
  async getSiteUtilization(siteId: string, month: string) {
    const { data, error } = await supabase.rpc('get_site_utilization', {
      site_uuid: siteId,
      month_date: month
    });

    if (error) throw error;
    return data || [];
  }

  // Get guard availability patterns
  async getGuardAvailabilityPatterns(guardId: string, weeks = 4) {
    const { data, error } = await supabase.rpc('get_guard_availability_patterns', {
      guard_uuid: guardId,
      weeks_param: weeks
    });

    if (error) throw error;
    return data || [];
  }

  // Get cost analysis
  async getCostAnalysis(startDate: string, endDate: string, siteId?: string) {
    const { data, error } = await supabase.rpc('get_cost_analysis', {
      start_date: startDate,
      end_date: endDate,
      site_id: siteId
    });

    if (error) throw error;
    return data || [];
  }

  // Get performance rankings
  async getPerformanceRankings(
    startDate: string,
    endDate: string,
    metric: 'attendance' | 'punctuality' | 'earnings',
    limit = 10
  ) {
    const { data, error } = await supabase.rpc('get_performance_rankings', {
      start_date: startDate,
      end_date: endDate,
      metric_type: metric,
      limit_param: limit
    });

    if (error) throw error;
    return data || [];
  }
}

export const analyticsService = new AnalyticsService();