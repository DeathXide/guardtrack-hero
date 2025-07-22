import { supabase } from "@/integrations/supabase/client";

export interface AttendanceOverviewData {
  sites: Array<{
    id: string;
    site_name: string;
    address: string;
    daySlots: number;
    nightSlots: number;
    dayAssigned: number;
    nightAssigned: number;
    dayPresent: number;
    nightPresent: number;
    status: 'fully-marked' | 'partially-marked' | 'not-marked' | 'no-shifts';
  }>;
}

// Optimized single query to get all attendance overview data
export const getAttendanceOverview = async (date: string): Promise<AttendanceOverviewData> => {
  // Single optimized query with joins
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select(`
      id,
      site_name,
      address,
      staffing_requirements (
        day_slots,
        night_slots
      )
    `);

  if (sitesError) throw sitesError;

  // Get shifts and attendance in parallel
  const [shiftsResult, attendanceResult] = await Promise.all([
    supabase
      .from('shifts')
      .select('site_id, type, guard_id')
      .not('guard_id', 'is', null),
    
    supabase
      .from('attendance_records')
      .select('site_id, shift_type, status')
      .eq('attendance_date', date)
      .eq('status', 'present')
  ]);

  if (shiftsResult.error) throw shiftsResult.error;
  if (attendanceResult.error) throw attendanceResult.error;

  // Process data efficiently on backend
  const processedSites = sites.map(site => {
    const daySlots = site.staffing_requirements?.reduce((sum, req) => sum + req.day_slots, 0) || 0;
    const nightSlots = site.staffing_requirements?.reduce((sum, req) => sum + req.night_slots, 0) || 0;
    
    const siteShifts = shiftsResult.data.filter(shift => shift.site_id === site.id);
    const dayAssigned = siteShifts.filter(shift => shift.type === 'day').length;
    const nightAssigned = siteShifts.filter(shift => shift.type === 'night').length;
    
    const siteAttendance = attendanceResult.data.filter(record => record.site_id === site.id);
    const dayPresent = siteAttendance.filter(record => record.shift_type === 'day').length;
    const nightPresent = siteAttendance.filter(record => record.shift_type === 'night').length;
    
    // Calculate status efficiently
    let status: 'fully-marked' | 'partially-marked' | 'not-marked' | 'no-shifts';
    if (dayAssigned === 0 && nightAssigned === 0) {
      status = 'no-shifts';
    } else if (dayPresent === dayAssigned && nightPresent === nightAssigned) {
      status = 'fully-marked';
    } else if (dayPresent === 0 && nightPresent === 0) {
      status = 'not-marked';
    } else {
      status = 'partially-marked';
    }

    return {
      id: site.id,
      site_name: site.site_name,
      address: site.address,
      daySlots,
      nightSlots,
      dayAssigned,
      nightAssigned,
      dayPresent,
      nightPresent,
      status
    };
  });

  return { sites: processedSites };
};