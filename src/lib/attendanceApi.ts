import { supabase } from "@/integrations/supabase/client";

// Define types based on existing database structure
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  site_id: string;
  attendance_date: string;
  shift_type: string;
  employee_type: string;
  status: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  break_duration?: number;
  overtime_hours?: number;
  check_in_location?: any;
  check_out_location?: any;
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  is_correction?: boolean;
  correction_reason?: string;
  original_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAttendanceData {
  employee_id: string;
  site_id: string;
  attendance_date: string;
  shift_type: 'day' | 'night';
  employee_type?: string;
  status: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  break_duration?: number;
  overtime_hours?: number;
  check_in_location?: any;
  check_out_location?: any;
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  notes?: string;
  approved_by?: string;
  is_correction?: boolean;
  correction_reason?: string;
  original_record_id?: string;
}

export interface AttendanceSettings {
  id: string;
  site_id: string;
  day_shift_start: string;
  day_shift_end: string;
  night_shift_start: string;
  night_shift_end: string;
  late_grace_period: number;
  early_departure_grace_period: number;
  require_check_in_photo: boolean;
  require_check_out_photo: boolean;
  site_latitude?: number;
  site_longitude?: number;
  location_radius: number;
  allowed_break_duration: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAttendanceSettingsData {
  site_id: string;
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  late_grace_period?: number;
  early_departure_grace_period?: number;
  require_check_in_photo?: boolean;
  require_check_out_photo?: boolean;
  site_latitude?: number;
  site_longitude?: number;
  location_radius?: number;
  allowed_break_duration?: number;
}

// Attendance Records API
export const attendanceApi = {
  // Create or update attendance record (idempotent)
  async createAttendanceRecord(recordData: CreateAttendanceData) {
    // First check if record already exists for this guard, site, date, and shift
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', recordData.employee_id)
      .eq('site_id', recordData.site_id)
      .eq('attendance_date', recordData.attendance_date)
      .eq('shift_type', recordData.shift_type)
      .eq('employee_type', recordData.employee_type || 'guard')
      .single();

    if (existingRecord) {
      // Update existing record to present status
      const { data, error } = await supabase
        .from('attendance_records')
        .update({ 
          status: recordData.status,
          actual_start_time: recordData.actual_start_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert(recordData)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Get attendance records by date
  async getAttendanceByDate(date: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        guards (
          name,
          badge_number,
          status
        )
      `)
      .eq('attendance_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get attendance records by site and date
  async getAttendanceBySiteAndDate(siteId: string, date: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        guards (
          name,
          badge_number,
          status,
          guard_photo_url
        )
      `)
      .eq('site_id', siteId)
      .eq('attendance_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get attendance records by guard and date range
  async getAttendanceByGuardAndDateRange(guardId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        guards (
          name,
          badge_number
        )
      `)
      .eq('employee_id', guardId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update attendance record
  async updateAttendanceRecord(id: string, recordData: Partial<AttendanceRecord>) {
    const { data, error } = await supabase
      .from('attendance_records')
      .update(recordData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete attendance record
  async deleteAttendanceRecord(id: string) {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Check if guard is marked present elsewhere on the same date and shift type
  async isGuardMarkedElsewhere(guardId: string, date: string, shiftType: string, excludeSiteId?: string) {
    let query = supabase
      .from('attendance_records')
      .select('id, site_id')
      .eq('employee_id', guardId)
      .eq('attendance_date', date)
      .eq('shift_type', shiftType)
      .eq('status', 'present');

    if (excludeSiteId) {
      query = query.neq('site_id', excludeSiteId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.length > 0;
  },

  // Get attendance summary for a site and date
  async getAttendanceSummary(siteId: string, date: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('shift_type, status')
      .eq('site_id', siteId)
      .eq('attendance_date', date);

    if (error) throw error;

    const summary = {
      dayShift: {
        present: 0,
        absent: 0,
        total: 0
      },
      nightShift: {
        present: 0,
        absent: 0,
        total: 0
      }
    };

    data.forEach(record => {
      const shift = record.shift_type === 'day' ? summary.dayShift : summary.nightShift;
      shift.total++;
      if (record.status === 'present') {
        shift.present++;
      } else {
        shift.absent++;
      }
    });

    return summary;
  },

  // Mark multiple guards present for a specific shift
  async markMultipleGuardsPresent(recordsData: CreateAttendanceData[]) {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(recordsData)
      .select();

    if (error) throw error;
    return data;
  },

  // Copy attendance from one date to another
  async copyAttendanceFromDate(fromDate: string, toDate: string, siteId: string) {
    // First get the attendance records from the source date
    const { data: sourceRecords, error: fetchError } = await supabase
      .from('attendance_records')
      .select('employee_id, site_id, shift_type, employee_type')
      .eq('attendance_date', fromDate)
      .eq('site_id', siteId)
      .eq('status', 'present');

    if (fetchError) throw fetchError;

    if (sourceRecords.length === 0) {
      return { copied: 0, message: 'No records found for the source date' };
    }

    // Create new records for the target date
    const newRecords: CreateAttendanceData[] = sourceRecords.map(record => ({
      employee_id: record.employee_id,
      site_id: record.site_id,
      attendance_date: toDate,
      shift_type: record.shift_type as 'day' | 'night',
      employee_type: record.employee_type,
      status: 'present',
      scheduled_start_time: new Date().toISOString(),
      scheduled_end_time: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(newRecords)
      .select();

    if (error) throw error;
    return { copied: data.length, records: data };
  },

  // Get attendance statistics for a guard over a period
  async getGuardAttendanceStats(guardId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('status, attendance_date, overtime_hours')
      .eq('employee_id', guardId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) throw error;

    const stats = {
      totalDays: data.length,
      presentDays: data.filter(r => r.status === 'present').length,
      absentDays: data.filter(r => r.status === 'absent').length,
      totalOvertimeHours: data.reduce((sum, r) => sum + (Number(r.overtime_hours) || 0), 0),
      attendancePercentage: 0
    };

    if (stats.totalDays > 0) {
      stats.attendancePercentage = Math.round((stats.presentDays / stats.totalDays) * 100);
    }

    return stats;
  }
};

// Attendance Settings API
export const attendanceSettingsApi = {
  // Create attendance settings for a site
  async createAttendanceSettings(settingsData: CreateAttendanceSettingsData) {
    const { data, error } = await supabase
      .from('attendance_settings')
      .insert(settingsData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get attendance settings by site ID
  async getAttendanceSettings(siteId: string) {
    const { data, error } = await supabase
      .from('attendance_settings')
      .select('*')
      .eq('site_id', siteId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data;
  },

  // Update attendance settings
  async updateAttendanceSettings(siteId: string, settingsData: Partial<AttendanceSettings>) {
    const { data, error } = await supabase
      .from('attendance_settings')
      .update(settingsData)
      .eq('site_id', siteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get or create attendance settings (upsert functionality)
  async getOrCreateAttendanceSettings(siteId: string, defaultSettings?: Partial<CreateAttendanceSettingsData>) {
    // Try to get existing settings first
    let settings = await this.getAttendanceSettings(siteId);
    
    if (!settings) {
      // Create default settings if they don't exist
      const defaultData: CreateAttendanceSettingsData = {
        site_id: siteId,
        day_shift_start: '08:00:00',
        day_shift_end: '20:00:00',
        night_shift_start: '20:00:00',
        night_shift_end: '08:00:00',
        late_grace_period: 15,
        early_departure_grace_period: 15,
        require_check_in_photo: true,
        require_check_out_photo: false,
        location_radius: 100,
        allowed_break_duration: 30,
        ...defaultSettings
      };
      
      settings = await this.createAttendanceSettings(defaultData);
    }
    
    return settings;
  },

  // Delete attendance settings
  async deleteAttendanceSettings(siteId: string) {
    const { error } = await supabase
      .from('attendance_settings')
      .delete()
      .eq('site_id', siteId);

    if (error) throw error;
    return true;
  }
};

// Utility functions for attendance management
export const attendanceUtils = {
  // Calculate shift duration in hours
  calculateShiftDuration(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}`);
    let end = new Date(`2000-01-01T${endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end = new Date(`2000-01-02T${endTime}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  },

  // Check if current time is within shift hours
  isWithinShiftHours(shiftType: 'day' | 'night', currentTime: Date = new Date()): boolean {
    const hours = currentTime.getHours();
    
    if (shiftType === 'day') {
      return hours >= 8 && hours < 20;
    } else {
      return hours >= 20 || hours < 8;
    }
  },

  // Calculate late arrival in minutes
  calculateLateArrival(scheduledTime: string, actualTime: string): number {
    const scheduled = new Date(`2000-01-01T${scheduledTime}`);
    const actual = new Date(`2000-01-01T${actualTime}`);
    
    if (actual <= scheduled) return 0;
    
    return Math.floor((actual.getTime() - scheduled.getTime()) / (1000 * 60));
  },

  // Calculate early departure in minutes
  calculateEarlyDeparture(scheduledTime: string, actualTime: string): number {
    const scheduled = new Date(`2000-01-01T${scheduledTime}`);
    const actual = new Date(`2000-01-01T${actualTime}`);
    
    if (actual >= scheduled) return 0;
    
    return Math.floor((scheduled.getTime() - actual.getTime()) / (1000 * 60));
  },

  // Format attendance status for display
  formatAttendanceStatus(status: string): string {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Late';
      case 'early_departure':
        return 'Early Departure';
      case 'overtime':
        return 'Overtime';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  },

  // Get attendance status color
  getAttendanceStatusColor(status: string): string {
    switch (status) {
      case 'present':
        return 'green';
      case 'absent':
        return 'red';
      case 'late':
        return 'orange';
      case 'early_departure':
        return 'yellow';
      case 'overtime':
        return 'blue';
      default:
        return 'gray';
    }
  },

  // Calculate distance between two coordinates (for location validation)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  },

  // Validate if check-in location is within allowed radius
  isLocationValid(
    siteLatitude: number, 
    siteLongitude: number, 
    userLatitude: number, 
    userLongitude: number, 
    allowedRadius: number = 100
  ): boolean {
    const distance = this.calculateDistance(
      siteLatitude, 
      siteLongitude, 
      userLatitude, 
      userLongitude
    );
    return distance <= allowedRadius;
  },

  // Generate attendance report data
  generateAttendanceReport(records: AttendanceRecord[], startDate: string, endDate: string) {
    const reportData = {
      period: `${startDate} to ${endDate}`,
      totalRecords: records.length,
      presentCount: records.filter(r => r.status === 'present').length,
      absentCount: records.filter(r => r.status === 'absent').length,
      lateCount: records.filter(r => r.status === 'late').length,
      overtimeHours: records.reduce((sum, r) => sum + (Number(r.overtime_hours) || 0), 0),
      attendancePercentage: 0
    };

    if (reportData.totalRecords > 0) {
      reportData.attendancePercentage = Math.round(
        (reportData.presentCount / reportData.totalRecords) * 100
      );
    }

    return reportData;
  }
};