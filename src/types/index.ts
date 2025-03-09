
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
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  guardId: string; // Added guardId property
  date: string;
  amount: number;
  note?: string;
  type: 'bonus' | 'deduction';
  month?: string; // Added month field for tracking monthly payments
  created_at?: string;
}

// New interface for monthly earnings tracking
export interface MonthlyEarning {
  month: string;
  totalShifts: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
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
  payRate?: number; // Monthly pay rate
  shiftRate?: number; // Per shift rate calculated from monthly rate
  paymentHistory?: PaymentRecord[];
  monthlyEarnings?: { [key: string]: MonthlyEarning }; // Track earnings by month
  created_at?: string;
}

export interface Shift {
  id: string;
  siteId: string;
  type: 'day' | 'night';
  guardId: string;
  assignedGuardId?: string; // For replacement guards
  locked?: boolean; // To lock assignments
  date?: string; // Date for the shift
  created_at?: string;
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
  created_at?: string;
}

export interface AttendanceReport {
  guardId: string;
  guardName: string;
  totalShifts: number;
  presentCount: number;
  absentCount: number;
  replacedCount: number;
  reassignedCount: number;
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

// Database types
export type SiteDB = {
  id: string;
  name: string;
  location: string;
  supervisor_id: string | null;
  day_slots: number;
  night_slots: number;
  created_at: string;
}

export type GuardDB = {
  id: string;
  name: string;
  email: string;
  phone: string;
  badge_number: string;
  avatar: string | null;
  status: 'active' | 'inactive';
  type: 'permanent' | 'temporary';
  pay_rate: number;
  created_at: string;
}

export type ShiftDB = {
  id: string;
  site_id: string;
  type: 'day' | 'night';
  guard_id: string | null;
  created_at: string;
}

export type AttendanceRecordDB = {
  id: string;
  date: string;
  shift_id: string;
  guard_id: string;
  status: 'present' | 'absent' | 'replaced' | 'reassigned';
  replacement_guard_id: string | null;
  reassigned_site_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export type PaymentRecordDB = {
  id: string;
  guard_id: string;
  date: string;
  amount: number;
  note: string | null;
  type: 'bonus' | 'deduction';
  month: string | null;
  created_at: string;
}
