
import { User, Site, Guard, Shift, AttendanceRecord, MonthlyEarning } from '@/types';

// Demo Users with different roles
export const users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@secureguard.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Site Supervisor',
    email: 'supervisor@secureguard.com',
    role: 'supervisor'
  },
  {
    id: '3',
    name: 'Security Guard',
    email: 'guard@secureguard.com',
    role: 'guard'
  }
];

// Sample Sites with local data
export let sites: Site[] = [
  {
    id: '1',
    name: 'Corporate Tower A',
    location: 'Business District, Mumbai',
    daySlots: 2,
    nightSlots: 3,
    payRate: 15000,
    supervisorId: '2'
  },
  {
    id: '2',
    name: 'Shopping Mall Central',
    location: 'Central Mumbai',
    daySlots: 4,
    nightSlots: 2,
    payRate: 20000,
    supervisorId: '2'
  }
];

// Empty Guards
export const guards: Guard[] = [];

// Empty Shifts
export const shifts: Shift[] = [];

// Function to generate dates (keeping this for future use)
const getDateString = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Empty Attendance Records
export const generateAttendanceRecords = (): AttendanceRecord[] => {
  return [];
};

export const attendanceRecords = generateAttendanceRecords();

// Helper Functions (keeping these helpers for future use)
export const getSiteById = (id: string): Site | undefined => {
  return sites.find(site => site.id === id);
};

export const getGuardById = (id: string): Guard | undefined => {
  return guards.find(guard => guard.id === id);
};

export const getShiftsBySite = (siteId: string): Shift[] => {
  return shifts.filter(shift => shift.siteId === siteId);
};

export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.date === date);
};

export const getAttendanceByGuard = (guardId: string): AttendanceRecord[] => {
  return attendanceRecords.filter(
    record => record.guardId === guardId || record.replacementGuardId === guardId
  );
};

export const getAttendanceBySite = (siteId: string): AttendanceRecord[] => {
  const siteShiftIds = shifts.filter(shift => shift.siteId === siteId).map(shift => shift.id);
  return attendanceRecords.filter(record => siteShiftIds.includes(record.shiftId));
};

// Calculate attendance percentage for a guard
export const calculateGuardAttendance = (guardId: string): number => {
  const records = getAttendanceByGuard(guardId);
  if (records.length === 0) return 0;
  
  const presentCount = records.filter(r => 
    (r.guardId === guardId && r.status === 'present') || 
    (r.replacementGuardId === guardId)
  ).length;
  
  return (presentCount / records.length) * 100;
};

// Calculate staffing percentage for a site
export const calculateSiteStaffing = (siteId: string): number => {
  const site = getSiteById(siteId);
  if (!site) return 0;
  
  const records = getAttendanceBySite(siteId);
  if (records.length === 0) return 0;
  
  const filledShifts = records.filter(r => 
    r.status === 'present' || r.status === 'replaced'
  ).length;
  
  return (filledShifts / records.length) * 100;
};

// Function to check if a guard is marked present anywhere for a given date and shift type
export const isGuardMarkedPresentElsewhere = (guardId: string, date: string, shiftType: 'day' | 'night', excludeSiteId?: string): boolean => {
  const dateRecords = getAttendanceByDate(date);
  
  // Get all shifts for the given shift type
  const relevantShifts = shifts.filter(shift => shift.type === shiftType);
  
  // Check if the guard is marked present or reassigned in any other site for this date and shift type
  return dateRecords.some(record => {
    // Find the shift for this record
    const shift = relevantShifts.find(s => s.id === record.shiftId);
    
    // Skip if shift is not found or is for the excluded site
    if (!shift || (excludeSiteId && shift.siteId === excludeSiteId)) {
      return false;
    }
    
    // Check if the guard is marked present or is a replacement at this site
    return (record.guardId === guardId && (record.status === 'present' || record.status === 'reassigned')) || 
           (record.replacementGuardId === guardId && record.status === 'replaced');
  });
};

// Calculate guard's daily earnings
export const calculateGuardDailyEarnings = (guardId: string, date: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.payRate) return 0;
  
  const dateRecords = getAttendanceByDate(date);
  
  // Count shifts where the guard was present or was a replacement
  const shiftsWorked = dateRecords.filter(record => 
    (record.guardId === guardId && record.status === 'present') ||
    (record.replacementGuardId === guardId && record.status === 'replaced')
  ).length;
  
  // Calculate earnings (pay rate per shift)
  return shiftsWorked * guard.payRate;
};

// Get guard's total deductions
export const getGuardDeductions = (guardId: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.paymentHistory) return 0;
  
  const deductions = guard.paymentHistory.filter(payment => payment.type === 'deduction');
  return deductions.reduce((total, payment) => total + payment.amount, 0);
};

// Get guard's total bonuses
export const getGuardBonuses = (guardId: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.paymentHistory) return 0;
  
  const bonuses = guard.paymentHistory.filter(payment => payment.type === 'bonus');
  return bonuses.reduce((total, payment) => total + payment.amount, 0);
};

// Local data manipulation functions
export const addSite = (site: Omit<Site, 'id'>): Site => {
  const newSite: Site = {
    ...site,
    id: Math.random().toString(36).substring(2, 15)
  };
  sites.push(newSite);
  return newSite;
};

export const updateSiteLocal = (id: string, updates: Partial<Site>): Site | null => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return null;
  
  sites[index] = { ...sites[index], ...updates };
  return sites[index];
};

export const deleteSiteLocal = (id: string): boolean => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return false;
  
  sites.splice(index, 1);
  return true;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
