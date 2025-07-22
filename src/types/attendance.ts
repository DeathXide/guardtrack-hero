export interface EmployeeType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_type: string;
  site_id: string;
  shift_type: 'day' | 'night';
  
  // Timing
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  
  // Status and verification
  status: 'scheduled' | 'present' | 'absent' | 'late' | 'early_departure' | 'on_leave' | 'overtime';
  attendance_date: string;
  
  // Location and verification
  check_in_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  check_out_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  check_in_photo_url?: string;
  check_out_photo_url?: string;
  
  // Additional info
  notes?: string;
  overtime_hours?: number;
  break_duration?: number;
  
  // Approval workflow
  approved_by?: string;
  approved_at?: string;
  correction_reason?: string;
  is_correction?: boolean;
  original_record_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_type: string;
  
  leave_type: 'sick' | 'vacation' | 'personal' | 'emergency' | 'maternity' | 'paternity';
  start_date: string;
  end_date: string;
  days_count: number;
  
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  
  created_at: string;
  updated_at: string;
}

export interface AttendanceSettings {
  id: string;
  site_id: string;
  
  // Grace periods (in minutes)
  late_grace_period?: number;
  early_departure_grace_period?: number;
  
  // Shift timings
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  
  // Location settings
  location_radius?: number;
  site_latitude?: number;
  site_longitude?: number;
  
  // Photo requirements
  require_check_in_photo?: boolean;
  require_check_out_photo?: boolean;
  
  // Break settings
  allowed_break_duration?: number;
  
  created_at: string;
  updated_at: string;
}

export interface AttendanceAnalytics {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  overtimeRecords: number;
  totalOvertimeHours: number;
  records: AttendanceRecord[];
}

export interface EmployeeAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendanceRate: number;
  totalOvertimeHours: number;
  records: AttendanceRecord[];
}