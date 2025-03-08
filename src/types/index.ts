
export type UserRole = 'admin' | 'supervisor' | 'guard';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  supervisorId: string;
  daySlots: number;
  nightSlots: number;
}

export interface Guard {
  id: string;
  name: string;
  email: string;
  phone: string;
  badgeNumber: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Shift {
  id: string;
  siteId: string;
  type: 'day' | 'night';
  guardId: string;
  assignedGuardId?: string; // For replacement guards
}

export interface AttendanceRecord {
  id: string;
  date: string;
  shiftId: string;
  guardId: string;
  status: 'present' | 'absent' | 'replaced';
  replacementGuardId?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface AttendanceReport {
  guardId: string;
  guardName: string;
  totalShifts: number;
  presentCount: number;
  absentCount: number;
  replacedCount: number;
  attendancePercentage: number;
}

export interface SiteReport {
  siteId: string;
  siteName: string;
  daySlots: number;
  nightSlots: number;
  dayFilled: number;
  nightFilled: number;
  dayPercentage: number;
  nightPercentage: number;
  overallPercentage: number;
}
