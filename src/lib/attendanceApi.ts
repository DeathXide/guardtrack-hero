import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord, LeaveRequest, AttendanceSettings, EmployeeType } from '@/types/attendance';
import { format } from 'date-fns';

// Import Supabase types
type AttendanceInsert = {
  employee_id: string;
  employee_type?: string;
  site_id: string;
  shift_type: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status?: string;
  attendance_date?: string;
  check_in_location?: any;
  check_out_location?: any;
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  notes?: string;
  overtime_hours?: number;
  break_duration?: number;
  approved_by?: string;
  approved_at?: string;
  correction_reason?: string;
  is_correction?: boolean;
  original_record_id?: string;
};

type LeaveRequestInsert = {
  employee_id: string;
  employee_type?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
};

type AttendanceSettingsInsert = {
  site_id: string;
  late_grace_period?: number;
  early_departure_grace_period?: number;
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  location_radius?: number;
  site_latitude?: number;
  site_longitude?: number;
  require_check_in_photo?: boolean;
  require_check_out_photo?: boolean;
  allowed_break_duration?: number;
};

// Employee Types API
export const fetchEmployeeTypes = async (): Promise<EmployeeType[]> => {
  const { data, error } = await supabase
    .from('employee_types')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

// Attendance Records API
export const fetchAttendanceRecords = async (filters?: {
  siteId?: string;
  employeeId?: string;
  employeeType?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  let query = supabase
    .from('attendance_records')
    .select(`
      *,
      sites(id, site_name),
      guards(id, name, badge_number)
    `);

  if (filters?.siteId) {
    query = query.eq('site_id', filters.siteId);
  }
  
  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  
  if (filters?.employeeType) {
    query = query.eq('employee_type', filters.employeeType);
  }
  
  if (filters?.startDate) {
    query = query.gte('attendance_date', format(filters.startDate, 'yyyy-MM-dd'));
  }
  
  if (filters?.endDate) {
    query = query.lte('attendance_date', format(filters.endDate, 'yyyy-MM-dd'));
  }
  
  const { data, error } = await query.order('attendance_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const fetchTodayAttendance = async (siteId?: string) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  let query = supabase
    .from('attendance_records')
    .select(`
      *,
      sites(id, site_name),
      guards(id, name, badge_number)
    `)
    .eq('attendance_date', today);
  
  if (siteId) {
    query = query.eq('site_id', siteId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createAttendanceRecord = async (record: AttendanceInsert) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert(record)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAttendanceRecord = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const checkInEmployee = async (params: {
  employeeId: string;
  employeeType: string;
  siteId: string;
  shiftType: 'day' | 'night';
  location?: { lat: number; lng: number; address?: string };
  photoUrl?: string;
  notes?: string;
}) => {
  const now = new Date();
  const attendanceDate = format(now, 'yyyy-MM-dd');
  
  // Check if record already exists
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', params.employeeId)
    .eq('employee_type', params.employeeType)
    .eq('site_id', params.siteId)
    .eq('attendance_date', attendanceDate)
    .eq('shift_type', params.shiftType)
    .single();
  
  if (existing) {
    // Update existing record with check-in
    return await updateAttendanceRecord(existing.id, {
      actual_start_time: now.toISOString(),
      check_in_location: params.location,
      check_in_photo_url: params.photoUrl,
      status: 'present',
      notes: params.notes
    });
  } else {
    // Create new record
    const settings = await fetchAttendanceSettings(params.siteId);
    const shiftStart = params.shiftType === 'day' ? settings?.day_shift_start : settings?.night_shift_start;
    const shiftEnd = params.shiftType === 'day' ? settings?.day_shift_end : settings?.night_shift_end;
    
    return await createAttendanceRecord({
      employee_id: params.employeeId,
      employee_type: params.employeeType,
      site_id: params.siteId,
      shift_type: params.shiftType,
      attendance_date: attendanceDate,
      scheduled_start_time: `${attendanceDate}T${shiftStart || '08:00'}:00Z`,
      scheduled_end_time: `${attendanceDate}T${shiftEnd || '17:00'}:00Z`,
      actual_start_time: now.toISOString(),
      check_in_location: params.location as any,
      check_in_photo_url: params.photoUrl,
      status: 'present',
      notes: params.notes
    });
  }
};

export const checkOutEmployee = async (
  recordId: string,
  params: {
    location?: { lat: number; lng: number; address?: string };
    photoUrl?: string;
    notes?: string;
    overtimeHours?: number;
  }
) => {
  const now = new Date();
  
  return await updateAttendanceRecord(recordId, {
    actual_end_time: now.toISOString(),
    check_out_location: params.location as any,
    check_out_photo_url: params.photoUrl,
    overtime_hours: params.overtimeHours || 0,
    notes: params.notes
  });
};

// Leave Requests API
export const fetchLeaveRequests = async (filters?: {
  employeeId?: string;
  employeeType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  let query = supabase
    .from('leave_requests')
    .select('*');

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  
  if (filters?.employeeType) {
    query = query.eq('employee_type', filters.employeeType);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.startDate) {
    query = query.gte('start_date', format(filters.startDate, 'yyyy-MM-dd'));
  }
  
  if (filters?.endDate) {
    query = query.lte('end_date', format(filters.endDate, 'yyyy-MM-dd'));
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createLeaveRequest = async (request: LeaveRequestInsert) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(request)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateLeaveRequest = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const approveLeaveRequest = async (id: string, approverId: string) => {
  return await updateLeaveRequest(id, {
    status: 'approved',
    approved_by: approverId,
    approved_at: new Date().toISOString()
  });
};

export const rejectLeaveRequest = async (id: string, approverId: string, reason: string) => {
  return await updateLeaveRequest(id, {
    status: 'rejected',
    approved_by: approverId,
    approved_at: new Date().toISOString(),
    rejection_reason: reason
  });
};

// Attendance Settings API
export const fetchAttendanceSettings = async (siteId: string) => {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .eq('site_id', siteId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
};

export const createAttendanceSettings = async (settings: AttendanceSettingsInsert) => {
  const { data, error } = await supabase
    .from('attendance_settings')
    .insert(settings)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAttendanceSettings = async (siteId: string, updates: any) => {
  const { data, error } = await supabase
    .from('attendance_settings')
    .update(updates)
    .eq('site_id', siteId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Analytics and Reports
export const getAttendanceAnalytics = async (params: {
  siteId?: string;
  employeeType?: string;
  startDate: Date;
  endDate: Date;
}) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      sites(site_name),
      guards(name, badge_number)
    `)
    .gte('attendance_date', format(params.startDate, 'yyyy-MM-dd'))
    .lte('attendance_date', format(params.endDate, 'yyyy-MM-dd'))
    .eq(params.siteId ? 'site_id' : '', params.siteId || '')
    .eq(params.employeeType ? 'employee_type' : '', params.employeeType || '');
  
  if (error) throw error;
  
  // Calculate analytics
  const totalRecords = data?.length || 0;
  const presentCount = data?.filter(r => r.status === 'present').length || 0;
  const absentCount = data?.filter(r => r.status === 'absent').length || 0;
  const lateCount = data?.filter(r => r.status === 'late').length || 0;
  const overtimeRecords = data?.filter(r => r.overtime_hours > 0) || [];
  const totalOvertimeHours = overtimeRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  
  return {
    totalRecords,
    presentCount,
    absentCount,
    lateCount,
    attendanceRate: totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
    overtimeRecords: overtimeRecords.length,
    totalOvertimeHours,
    records: data || []
  };
};

export const getEmployeeAttendanceSummary = async (employeeId: string, employeeType: string, month?: string) => {
  let query = supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('employee_type', employeeType);
  
  if (month) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
  }
  
  const { data, error } = await query.order('attendance_date', { ascending: false });
  
  if (error) throw error;
  
  const records = data || [];
  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  
  return {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
    totalOvertimeHours,
    records
  };
};