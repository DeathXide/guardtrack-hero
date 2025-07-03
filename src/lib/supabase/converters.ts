
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

// Site converters
export const convertSiteFromDB = (site: SiteDB): Site => ({
  id: site.id,
  name: site.name,
  organizationName: '',
  gstNumber: '',
  addressLine1: site.location,
  addressLine2: '',
  addressLine3: '',
  gstType: 'GST',
  siteType: '',
  location: site.location,
  
  daySlots: site.day_slots,
  nightSlots: site.night_slots,
  payRate: site.pay_rate || 0,
  staffingSlots: [],
  created_at: site.created_at
});

export const convertSiteToDB = (site: Partial<Site>): Partial<SiteDB> => ({
  name: site.name,
  location: site.location,
  
  day_slots: site.daySlots,
  night_slots: site.nightSlots,
  pay_rate: site.payRate || 0
});

// Guard converters
export const convertGuardFromDB = (guard: GuardDB): Guard => ({
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

export const convertGuardToDB = (guard: Partial<Guard>): Partial<GuardDB> => ({
  name: guard.name,
  email: guard.email,
  phone: guard.phone,
  badge_number: guard.badgeNumber,
  avatar: guard.avatar,
  status: guard.status as 'active' | 'inactive',
  type: guard.type as 'permanent' | 'temporary',
  pay_rate: guard.payRate
});

// Shift converters
export const convertShiftFromDB = (shift: ShiftDB): Shift => ({
  id: shift.id,
  siteId: shift.site_id,
  type: shift.type,
  guardId: shift.guard_id || '',
  created_at: shift.created_at
});

export const convertShiftToDB = (shift: Partial<Shift>): Partial<ShiftDB> => ({
  site_id: shift.siteId,
  type: shift.type as 'day' | 'night',
  guard_id: shift.guardId || null
});

// Attendance converters
export const convertAttendanceFromDB = (record: AttendanceRecordDB): AttendanceRecord => ({
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

export const convertAttendanceToDB = (record: Partial<AttendanceRecord>): Partial<AttendanceRecordDB> => ({
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

// Payment converters
export const convertPaymentFromDB = (record: PaymentRecordDB): PaymentRecord => ({
  id: record.id,
  guardId: record.guard_id,
  date: record.date,
  amount: record.amount,
  note: record.note || undefined,
  type: record.type,
  month: record.month || undefined,
  created_at: record.created_at
});

export const convertPaymentToDB = (record: Partial<PaymentRecord>): Partial<PaymentRecordDB> => ({
  guard_id: record.guardId,
  date: record.date,
  amount: record.amount,
  note: record.note || null,
  type: record.type as 'bonus' | 'deduction',
  month: record.month || null
});
