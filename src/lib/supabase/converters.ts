
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
  dateOfBirth: guard.date_of_birth || undefined,
  gender: guard.gender,
  languagesSpoken: guard.languages_spoken,
  guardPhoto: guard.guard_photo || undefined,
  aadhaarNumber: guard.aadhaar_number || undefined,
  aadhaarCardPhoto: guard.aadhaar_card_photo || undefined,
  panCard: guard.pan_card || undefined,
  phone: guard.phone,
  alternatePhone: guard.alternate_phone || undefined,
  currentAddress: guard.current_address || undefined,
  permanentAddress: guard.permanent_address || undefined,
  type: guard.type,
  status: guard.status,
  payRate: guard.pay_rate || undefined,
  shiftRate: guard.shift_rate || undefined,
  bankName: guard.bank_name || undefined,
  accountNumber: guard.account_number || undefined,
  ifscCode: guard.ifsc_code || undefined,
  upiId: guard.upi_id || undefined,
  badgeNumber: guard.badge_number,
  avatar: guard.avatar || undefined,
  created_at: guard.created_at
});

export const convertGuardToDB = (guard: Partial<Guard>): Partial<GuardDB> => ({
  name: guard.name,
  date_of_birth: guard.dateOfBirth || null,
  gender: guard.gender as 'male' | 'female' | 'other',
  languages_spoken: guard.languagesSpoken || [],
  guard_photo: guard.guardPhoto || null,
  aadhaar_number: guard.aadhaarNumber || null,
  aadhaar_card_photo: guard.aadhaarCardPhoto || null,
  pan_card: guard.panCard || null,
  phone: guard.phone,
  alternate_phone: guard.alternatePhone || null,
  current_address: guard.currentAddress || null,
  permanent_address: guard.permanentAddress || null,
  type: guard.type as 'permanent' | 'contract',
  status: guard.status as 'active' | 'inactive',
  pay_rate: guard.payRate || null,
  shift_rate: guard.shiftRate || null,
  bank_name: guard.bankName || null,
  account_number: guard.accountNumber || null,
  ifsc_code: guard.ifscCode || null,
  upi_id: guard.upiId || null,
  badge_number: guard.badgeNumber,
  avatar: guard.avatar || null
});

// Shift converters
export const convertShiftFromDB = (shift: ShiftDB): Shift => ({
  id: shift.id,
  siteId: shift.site_id,
  type: shift.type,
  guardId: shift.guard_id || '',
  isTemporary: shift.is_temporary || undefined,
  temporaryDate: shift.temporary_date || undefined,
  temporaryRole: shift.temporary_role || undefined,
  temporaryPayRate: shift.temporary_pay_rate || undefined,
  created_at: shift.created_at
});

export const convertShiftToDB = (shift: Partial<Shift>): Partial<ShiftDB> => ({
  site_id: shift.siteId,
  type: shift.type as 'day' | 'night',
  guard_id: shift.guardId || null,
  is_temporary: shift.isTemporary || null,
  temporary_date: shift.temporaryDate || null,
  temporary_role: shift.temporaryRole || null,
  temporary_pay_rate: shift.temporaryPayRate || null
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
