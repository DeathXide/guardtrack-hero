
export type UserRole = 'admin' | 'supervisor' | 'guard';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface StaffingSlot {
  id: string;
  role: 'Security Guard' | 'Supervisor' | 'Housekeeping';
  daySlots: number;
  nightSlots: number;
  budgetPerSlot: number;
}

export interface Site {
  id: string;
  name: string;
  organizationName: string;
  gstNumber: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  gstType: 'GST' | 'NGST' | 'RCM' | 'PERSONAL';
  siteType: string;
  staffingSlots: StaffingSlot[];
  // Legacy fields for backward compatibility
  location?: string;
  daySlots?: number;
  nightSlots?: number;
  payRate?: number;
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  guardId: string;
  date: string;
  amount: number;
  note?: string;
  type: 'bonus' | 'deduction';
  month?: string;
  created_at?: string;
}

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
  // Personal Details
  name: string;
  dateOfBirth?: string;
  gender: 'male' | 'female' | 'other';
  languagesSpoken: string[];
  guardPhoto?: string;
  
  // Identity Documents
  aadhaarNumber?: string;
  aadhaarCardPhoto?: string;
  panCard?: string;
  
  // Contact Information
  phone: string;
  alternatePhone?: string;
  email?: string;
  
  // Addresses
  currentAddress?: string;
  permanentAddress?: string;
  
  // Employment Status
  type: 'permanent' | 'contract';
  status: 'active' | 'inactive';
  
  // Compensation
  salary?: number;
  payRate?: number;
  shiftRate?: number;
  
  // Banking & Payments
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  
  // System fields
  badgeNumber: string;
  avatar?: string;
  paymentHistory?: PaymentRecord[];
  monthlyEarnings?: { [key: string]: MonthlyEarning };
  created_at?: string;
}

export interface Shift {
  id: string;
  siteId: string;
  type: 'day' | 'night';
  guardId: string;
  assignedGuardId?: string;
  locked?: boolean;
  date?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  shiftId: string;
  guardId: string;
  status: 'present' | 'absent' | 'replaced' | 'reassigned';
  replacementGuardId?: string;
  reassignedSiteId?: string;
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

export interface SiteEarnings {
  totalShifts: number;
  allocatedAmount: number;
  guardCosts: number;
  netEarnings: number;
}

export interface ScheduleAssignment {
  id: string;
  date: string;
  siteId: string;
  shiftType: 'day' | 'night';
  guardId: string;
  locked: boolean;
}

export type SiteDB = {
  id: string;
  name: string;
  location: string;
  supervisor_id: string | null;
  day_slots: number;
  night_slots: number;
  pay_rate: number;
  created_at: string;
}

export type GuardDB = {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other';
  languages_spoken: string[];
  guard_photo: string | null;
  aadhaar_number: string | null;
  aadhaar_card_photo: string | null;
  pan_card: string | null;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  current_address: string | null;
  permanent_address: string | null;
  type: 'permanent' | 'contract';
  status: 'active' | 'inactive';
  salary: number | null;
  pay_rate: number | null;
  shift_rate: number | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  badge_number: string;
  avatar: string | null;
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
