
import { supabase } from './client';
import { convertAttendanceFromDB, convertAttendanceToDB } from './converters';
import { AttendanceRecord, AttendanceRecordDB } from '@/types';

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
  if (record.shiftId && record.date) {
    const { data: existingRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('shift_id', record.shiftId)
      .eq('date', record.date)
      .eq('guard_id', record.guardId);
    
    if (existingRecords && existingRecords.length > 0) {
      const { data, error } = await supabase
        .from('attendance_records')
        .update(convertAttendanceToDB(record))
        .eq('id', existingRecords[0].id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance record:', error);
        throw error;
      }

      return convertAttendanceFromDB(data as AttendanceRecordDB);
    }
  }

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

export const isGuardMarkedPresentElsewhere = async (
  guardId: string, 
  date: string, 
  shiftType: 'day' | 'night', 
  excludeSiteId?: string
): Promise<boolean> => {
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

  const shiftIds = shiftData
    .filter(shift => shift.site_id !== excludeSiteId)
    .map(shift => shift.id);

  if (shiftIds.length === 0) {
    return false;
  }

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
