
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
  type: 'bonus' | 'deduction';
  month?: string; // Added month field for tracking monthly payments
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
  monthlyEarnings?: { [key: string]: number }; // Track earnings by month
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

// New interface for monthly earnings tracking
export interface MonthlyEarning {
  month: string;
  totalShifts: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
}
