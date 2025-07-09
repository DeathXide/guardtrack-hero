import { fetchAttendanceByDate, deleteAttendanceRecord, fetchShiftsBySite } from '@/lib/localService';
import { AttendanceRecord, Shift } from '@/types';

export interface GuardAttendanceInfo {
  guardId: string;
  attendanceRecordId: string;
  shiftId: string;
}

/**
 * Check if guards have attendance records for a specific date and site
 */
export const checkGuardsAttendanceForToday = async (
  guardIds: string[],
  siteId: string,
  date: string,
  shifts: Shift[]
): Promise<GuardAttendanceInfo[]> => {
  const attendanceRecords = await fetchAttendanceByDate(date);
  
  const guardsWithAttendance: GuardAttendanceInfo[] = [];
  
  for (const guardId of guardIds) {
    // Find attendance record for this guard at this site today
    const attendanceRecord = attendanceRecords.find(record => {
      const shift = shifts.find(s => s.id === record.shiftId);
      return record.guardId === guardId && 
             record.status === 'present' && 
             shift?.siteId === siteId;
    });
    
    if (attendanceRecord && attendanceRecord.id) {
      const shift = shifts.find(s => s.id === attendanceRecord.shiftId);
      if (shift) {
        guardsWithAttendance.push({
          guardId,
          attendanceRecordId: attendanceRecord.id,
          shiftId: shift.id
        });
      }
    }
  }
  
  return guardsWithAttendance;
};

/**
 * Delete today's attendance records for specific guards at a site
 */
export const deleteGuardsTodayAttendance = async (
  guardsAttendanceInfo: GuardAttendanceInfo[]
): Promise<void> => {
  for (const guardInfo of guardsAttendanceInfo) {
    await deleteAttendanceRecord(guardInfo.attendanceRecordId);
  }
};

/**
 * Check if a single guard has attendance for today at a specific site
 */
export const checkGuardAttendanceForToday = async (
  guardId: string,
  siteId: string,
  date: string,
  shifts: Shift[]
): Promise<GuardAttendanceInfo | null> => {
  const result = await checkGuardsAttendanceForToday([guardId], siteId, date, shifts);
  return result.length > 0 ? result[0] : null;
};