
import { createClient } from '@supabase/supabase-js';
import { 
  SiteDB, 
  GuardDB, 
  ShiftDB, 
  AttendanceRecordDB, 
  PaymentRecordDB,
  Site,
  Guard,
  Shift,
  AttendanceRecord,
  PaymentRecord
} from '@/types';

const supabaseUrl = 'https://amntnscgdmxemsjotqdn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtbnRuc2NnZG14ZW1zam90cWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NjYzNTcsImV4cCI6MjA1NzA0MjM1N30.XZmGGcDWWQiGFYSsusaxeQlnYxTkRn5BvdD0o5R5C_M';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Utility functions to convert between DB types and app types
const convertSiteFromDB = (site: SiteDB): Site => ({
  id: site.id,
  name: site.name,
  location: site.location,
  supervisorId: site.supervisor_id || '',
  daySlots: site.day_slots,
  nightSlots: site.night_slots,
  created_at: site.created_at
});

const convertSiteToDB = (site: Partial<Site>): Partial<SiteDB> => ({
  name: site.name,
  location: site.location,
  supervisor_id: site.supervisorId || null,
  day_slots: site.daySlots,
  night_slots: site.nightSlots
});

const convertGuardFromDB = (guard: GuardDB): Guard => ({
  id: guard.id,
  name: guard.name,
  email: guard.email,
  phone: guard.phone || '',
  badgeNumber: guard.badge_number,
  avatar: guard.avatar || undefined,
  status: guard.status,
  type: guard.type,
  payRate: guard.pay_rate,
  created_at: guard.created_at
});

const convertGuardToDB = (guard: Partial<Guard>): Partial<GuardDB> => ({
  name: guard.name,
  email: guard.email,
  phone: guard.phone,
  badge_number: guard.badgeNumber,
  avatar: guard.avatar,
  status: guard.status as 'active' | 'inactive',
  type: guard.type as 'permanent' | 'temporary',
  pay_rate: guard.payRate
});

const convertShiftFromDB = (shift: ShiftDB): Shift => ({
  id: shift.id,
  siteId: shift.site_id,
  type: shift.type,
  guardId: shift.guard_id || '',
  created_at: shift.created_at
});

const convertShiftToDB = (shift: Partial<Shift>): Partial<ShiftDB> => ({
  site_id: shift.siteId,
  type: shift.type as 'day' | 'night',
  guard_id: shift.guardId || null
});

const convertAttendanceFromDB = (record: AttendanceRecordDB): AttendanceRecord => ({
  id: record.id,
  date: record.date,
  shiftId: record.shift_id,
  guardId: record.guard_id,
  status: record.status,
  replacementGuardId: record.replacement_guard_id || undefined,
  reassignedSiteId: record.reassigned_site_id || undefined,
  approvedBy: record.approved_by || undefined,
  approvedAt: record.approved_at || undefined,
  notes: record.notes || undefined,
  created_at: record.created_at
});

const convertAttendanceToDB = (record: Partial<AttendanceRecord>): Partial<AttendanceRecordDB> => ({
  date: record.date,
  shift_id: record.shiftId,
  guard_id: record.guardId,
  status: record.status as 'present' | 'absent' | 'replaced' | 'reassigned',
  replacement_guard_id: record.replacementGuardId || null,
  reassigned_site_id: record.reassignedSiteId || null,
  approved_by: record.approvedBy || null,
  approved_at: record.approvedAt || null,
  notes: record.notes || null
});

const convertPaymentFromDB = (record: PaymentRecordDB): PaymentRecord => ({
  id: record.id,
  guardId: record.guard_id,
  date: record.date,
  amount: record.amount,
  note: record.note || undefined,
  type: record.type,
  month: record.month || undefined,
  created_at: record.created_at
});

const convertPaymentToDB = (record: Partial<PaymentRecord>): Partial<PaymentRecordDB> => ({
  guard_id: record.guardId,
  date: record.date,
  amount: record.amount,
  note: record.note || null,
  type: record.type as 'bonus' | 'deduction',
  month: record.month || null
});

// Sites API
export const fetchSites = async (): Promise<Site[]> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*');

  if (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }

  return (data as SiteDB[]).map(convertSiteFromDB);
};

export const fetchSite = async (id: string): Promise<Site | null> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching site with id ${id}:`, error);
    return null;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const createSite = async (site: Partial<Site>): Promise<Site> => {
  const { data, error } = await supabase
    .from('sites')
    .insert(convertSiteToDB(site))
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const updateSite = async (id: string, site: Partial<Site>): Promise<Site> => {
  const { data, error } = await supabase
    .from('sites')
    .update(convertSiteToDB(site))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating site with id ${id}:`, error);
    throw error;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const deleteSite = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting site with id ${id}:`, error);
    throw error;
  }
};

// Guards API
export const fetchGuards = async (): Promise<Guard[]> => {
  const { data, error } = await supabase
    .from('guards')
    .select('*');

  if (error) {
    console.error('Error fetching guards:', error);
    throw error;
  }

  return (data as GuardDB[]).map(convertGuardFromDB);
};

export const fetchGuard = async (id: string): Promise<Guard | null> => {
  const { data, error } = await supabase
    .from('guards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching guard with id ${id}:`, error);
    return null;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const createGuard = async (guard: Partial<Guard>): Promise<Guard> => {
  const { data, error } = await supabase
    .from('guards')
    .insert(convertGuardToDB(guard))
    .select()
    .single();

  if (error) {
    console.error('Error creating guard:', error);
    throw error;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const updateGuard = async (id: string, guard: Partial<Guard>): Promise<Guard> => {
  const { data, error } = await supabase
    .from('guards')
    .update(convertGuardToDB(guard))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating guard with id ${id}:`, error);
    throw error;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const deleteGuard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('guards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting guard with id ${id}:`, error);
    throw error;
  }
};

// Shifts API
export const fetchShifts = async (): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*');

  if (error) {
    console.error('Error fetching shifts:', error);
    throw error;
  }

  return (data as ShiftDB[]).map(convertShiftFromDB);
};

export const fetchShiftsBySite = async (siteId: string): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('site_id', siteId);

  if (error) {
    console.error(`Error fetching shifts for site ${siteId}:`, error);
    throw error;
  }

  return (data as ShiftDB[]).map(convertShiftFromDB);
};

export const createShift = async (shift: Partial<Shift>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .insert(convertShiftToDB(shift))
    .select()
    .single();

  if (error) {
    console.error('Error creating shift:', error);
    throw error;
  }

  return convertShiftFromDB(data as ShiftDB);
};

export const updateShift = async (id: string, shift: Partial<Shift>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .update(convertShiftToDB(shift))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating shift with id ${id}:`, error);
    throw error;
  }

  return convertShiftFromDB(data as ShiftDB);
};

export const deleteShift = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting shift with id ${id}:`, error);
    throw error;
  }
};

// Attendance Records API
export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*');

  if (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }

  return (data as AttendanceRecordDB[]).map(convertAttendanceFromDB);
};

export const fetchAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('date', date);

  if (error) {
    console.error(`Error fetching attendance for date ${date}:`, error);
    throw error;
  }

  return (data as AttendanceRecordDB[]).map(convertAttendanceFromDB);
};

export const fetchAttendanceByGuard = async (guardId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('guard_id', guardId);

  if (error) {
    console.error(`Error fetching attendance for guard ${guardId}:`, error);
    throw error;
  }

  return (data as AttendanceRecordDB[]).map(convertAttendanceFromDB);
};

export const fetchAttendanceByShift = async (shiftId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('shift_id', shiftId);

  if (error) {
    console.error(`Error fetching attendance for shift ${shiftId}:`, error);
    throw error;
  }

  return (data as AttendanceRecordDB[]).map(convertAttendanceFromDB);
};

export const createAttendanceRecord = async (record: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert(convertAttendanceToDB(record))
    .select()
    .single();

  if (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }

  return convertAttendanceFromDB(data as AttendanceRecordDB);
};

export const updateAttendanceRecord = async (id: string, record: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(convertAttendanceToDB(record))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating attendance record with id ${id}:`, error);
    throw error;
  }

  return convertAttendanceFromDB(data as AttendanceRecordDB);
};

export const deleteAttendanceRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting attendance record with id ${id}:`, error);
    throw error;
  }
};

// Payment Records API
export const fetchPaymentRecords = async (): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*');

  if (error) {
    console.error('Error fetching payment records:', error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const fetchPaymentsByGuard = async (guardId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('guard_id', guardId);

  if (error) {
    console.error(`Error fetching payments for guard ${guardId}:`, error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const fetchPaymentsByMonth = async (month: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('month', month);

  if (error) {
    console.error(`Error fetching payments for month ${month}:`, error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const createPaymentRecord = async (record: Partial<PaymentRecord> & { guardId: string }): Promise<PaymentRecord> => {
  const { data, error } = await supabase
    .from('payment_records')
    .insert(convertPaymentToDB(record))
    .select()
    .single();

  if (error) {
    console.error('Error creating payment record:', error);
    throw error;
  }

  return convertPaymentFromDB(data as PaymentRecordDB);
};

export const updatePaymentRecord = async (id: string, record: Partial<PaymentRecord>): Promise<PaymentRecord> => {
  const { data, error } = await supabase
    .from('payment_records')
    .update(convertPaymentToDB(record))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating payment record with id ${id}:`, error);
    throw error;
  }

  return convertPaymentFromDB(data as PaymentRecordDB);
};

export const deletePaymentRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('payment_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting payment record with id ${id}:`, error);
    throw error;
  }
};

// Helper functions for the app
export const isGuardMarkedPresentElsewhere = async (
  guardId: string, 
  date: string, 
  shiftType: 'day' | 'night', 
  excludeSiteId?: string
): Promise<boolean> => {
  // First, get all shifts of this type that the guard is assigned to
  const { data: shiftData, error: shiftError } = await supabase
    .from('shifts')
    .select('id, site_id')
    .eq('type', shiftType)
    .eq('guard_id', guardId);

  if (shiftError) {
    console.error('Error checking guard shifts:', shiftError);
    return false;
  }

  if (!shiftData || shiftData.length === 0) {
    return false;
  }

  // Filter out the shifts from the excluded site
  const shiftIds = shiftData
    .filter(shift => shift.site_id !== excludeSiteId)
    .map(shift => shift.id);

  if (shiftIds.length === 0) {
    return false;
  }

  // Check if there are any attendance records for these shifts on the given date
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('date', date)
    .eq('status', 'present')
    .in('shift_id', shiftIds);

  if (attendanceError) {
    console.error('Error checking guard attendance:', attendanceError);
    return false;
  }

  return attendanceData && attendanceData.length > 0;
};

export const calculateDailyRate = (guard: Guard | undefined): number => {
  if (!guard || !guard.payRate) return 0;
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  return guard.payRate / daysInMonth;
};

export const calculateMonthlyEarnings = async (guard: Guard | undefined, currentDate: Date): Promise<number> => {
  if (!guard) return 0;
  
  const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Get attendance records for this guard and month
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('guard_id', guard.id)
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`)
    .in('status', ['present', 'reassigned']);

  if (attendanceError) {
    console.error('Error calculating monthly earnings:', attendanceError);
    return 0;
  }

  const dailyRate = calculateDailyRate(guard);
  return (attendanceData?.length || 0) * dailyRate;
};
