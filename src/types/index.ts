
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

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  note?: string;
  type: 'salary' | 'bonus' | 'deduction'; // Added payment type
}

export interface Guard {
  id: string;
  name: string;
  email: string;
  phone: string;
  badgeNumber: string;
  avatar?: string;
  status: 'active' | 'inactive';
  type?: 'permanent' | 'temporary';
  payRate?: number; // Added payRate for individual guard pay
  paymentHistory?: PaymentRecord[];
}

export interface Shift {
  id: string;
  siteId: string;
  type: 'day' | 'night';
  guardId: string;
  assignedGuardId?: string; // For replacement guards
  locked?: boolean; // To lock assignments
  date?: string; // Date for the shift
}

export interface AttendanceRecord {
  id: string;
  date: string;
  shiftId: string;
  guardId: string;
  status: 'present' | 'absent' | 'replaced' | 'reassigned';
  replacementGuardId?: string;
  reassignedSiteId?: string; // For tracking site reassignments
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
  reassignedCount: number; // Field for tracking reassignments
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

export interface ScheduleAssignment {
  id: string;
  date: string;
  siteId: string;
  shiftType: 'day' | 'night';
  guardId: string;
  locked: boolean;
}
