import { User, Site, Guard, Shift, AttendanceRecord, MonthlyEarning, PaymentRecord, SiteEarnings } from '@/types';

// Essential users for authentication (keep at least one admin user)
export const users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@secureguard.com',
    role: 'admin'
  }
];

// Sample sites with staffing data for invoice generation
export let sites: Site[] = [
  {
    id: '1',
    name: 'Corporate Office Complex',
    organizationName: 'TechCorp Industries',
    gstNumber: '29ABCDE1234F1Z5',
    addressLine1: '123 Business District',
    addressLine2: 'Tech Park',
    addressLine3: 'Bangalore - 560001',
    gstType: 'GST',
    siteType: 'Corporate',
    staffingSlots: [
      {
        id: '1',
        role: 'Security Guard',
        daySlots: 4,
        nightSlots: 3,
        budgetPerSlot: 1500,
        rateType: 'monthly'
      },
      {
        id: '2',
        role: 'Supervisor',
        daySlots: 1,
        nightSlots: 1,
        budgetPerSlot: 2500,
        rateType: 'monthly'
      }
    ],
    created_at: '2024-08-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Manufacturing Plant',
    organizationName: 'Industrial Corp',
    gstNumber: '27XYZAB9876C1D2',
    addressLine1: '456 Industrial Area',
    addressLine2: 'Sector 5',
    addressLine3: 'Gurgaon - 122001',
    gstType: 'RCM',
    siteType: 'Industrial',
    staffingSlots: [
      {
        id: '3',
        role: 'Security Guard',
        daySlots: 6,
        nightSlots: 6,
        budgetPerSlot: 1400,
        rateType: 'monthly'
      },
      {
        id: '4',
        role: 'Housekeeping',
        daySlots: 2,
        nightSlots: 1,
        budgetPerSlot: 1200,
        rateType: 'monthly'
      }
    ],
    created_at: '2024-08-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Residential Complex',
    organizationName: 'Premium Homes Society',
    gstNumber: '',
    addressLine1: '789 Housing Society',
    addressLine2: 'Green Valley',
    addressLine3: 'Pune - 411001',
    gstType: 'PERSONAL',
    siteType: 'Residential',
    staffingSlots: [
      {
        id: '5',
        role: 'Security Guard',
        daySlots: 2,
        nightSlots: 2,
        budgetPerSlot: 1600,
        rateType: 'monthly'
      }
    ],
    created_at: '2024-08-01T00:00:00Z'
  }
];

// Empty guards array - ready for your real data
export let guards: Guard[] = [];

// Empty shifts array
export let shifts: Shift[] = [];

// Empty attendance records array
export let attendanceRecords: AttendanceRecord[] = [];

// Empty payment records array
export let paymentRecords: PaymentRecord[] = [];

// Utility functions for managing local data

// Site management functions
export const addSite = (siteData: Partial<Site>): Site => {
  const newSite: Site = {
    id: Date.now().toString(),
    name: siteData.name || '',
    organizationName: siteData.organizationName || '',
    gstNumber: siteData.gstNumber || '',
    addressLine1: siteData.addressLine1 || '',
    addressLine2: siteData.addressLine2 || '',
    addressLine3: siteData.addressLine3 || '',
    gstType: siteData.gstType || 'GST',
    siteType: siteData.siteType || '',
    staffingSlots: siteData.staffingSlots || [],
    // Legacy fields for backward compatibility
    location: siteData.location || '',
    daySlots: siteData.daySlots || 0,
    nightSlots: siteData.nightSlots || 0,
    payRate: siteData.payRate || 0,
    created_at: new Date().toISOString()
  };
  
  sites.push(newSite);
  return newSite;
};

export const updateSiteLocal = (id: string, siteData: Partial<Site>): Site | null => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return null;
  
  sites[index] = { ...sites[index], ...siteData };
  return sites[index];
};

export const deleteSiteLocal = (id: string): boolean => {
  const index = sites.findIndex(site => site.id === id);
  if (index === -1) return false;
  
  sites.splice(index, 1);
  return true;
};

export const fetchSites = async (): Promise<Site[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...sites];
};

export const createSite = async (siteData: Partial<Site>): Promise<Site> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  return addSite(siteData);
};

export const updateSite = async (id: string, siteData: Partial<Site>): Promise<Site> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const updated = updateSiteLocal(id, siteData);
  if (!updated) throw new Error('Site not found');
  return updated;
};

export const deleteSite = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const success = deleteSiteLocal(id);
  if (!success) throw new Error('Site not found');
};

// Guard management functions
export const addGuard = (guardData: Partial<Guard>): Guard => {
  const newGuard: Guard = {
    id: Date.now().toString(),
    name: guardData.name || '',
    dateOfBirth: guardData.dateOfBirth,
    gender: guardData.gender || 'male',
    languagesSpoken: guardData.languagesSpoken || [],
    guardPhoto: guardData.guardPhoto,
    aadhaarNumber: guardData.aadhaarNumber,
    aadhaarCardPhoto: guardData.aadhaarCardPhoto,
    panCard: guardData.panCard,
    phone: guardData.phone || '',
    alternatePhone: guardData.alternatePhone,
    currentAddress: guardData.currentAddress,
    permanentAddress: guardData.permanentAddress,
    type: guardData.type || 'permanent',
    status: guardData.status || 'active',
    payRate: guardData.payRate,
    shiftRate: guardData.shiftRate,
    bankName: guardData.bankName,
    accountNumber: guardData.accountNumber,
    ifscCode: guardData.ifscCode,
    upiId: guardData.upiId,
    badgeNumber: guardData.badgeNumber || `GRD${Date.now()}`,
    avatar: guardData.avatar,
    paymentHistory: [],
    monthlyEarnings: {},
    created_at: new Date().toISOString()
  };
  
  guards.push(newGuard);
  return newGuard;
};

export const updateGuardLocal = (id: string, guardData: Partial<Guard>): Guard | null => {
  const index = guards.findIndex(guard => guard.id === id);
  if (index === -1) return null;
  
  guards[index] = { ...guards[index], ...guardData };
  return guards[index];
};

export const deleteGuardLocal = (id: string): boolean => {
  const index = guards.findIndex(guard => guard.id === id);
  if (index === -1) return false;
  
  guards.splice(index, 1);
  return true;
};

export const fetchGuards = async (): Promise<Guard[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...guards];
};

export const createGuard = async (guardData: Partial<Guard>): Promise<Guard> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  return addGuard(guardData);
};

export const updateGuard = async (id: string, guardData: Partial<Guard>): Promise<Guard> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const updated = updateGuardLocal(id, guardData);
  if (!updated) throw new Error('Guard not found');
  return updated;
};

export const deleteGuard = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const success = deleteGuardLocal(id);
  if (!success) throw new Error('Guard not found');
};

// Payment management functions
export const addPaymentRecord = (paymentData: Partial<PaymentRecord>): PaymentRecord => {
  const newPayment: PaymentRecord = {
    id: Date.now().toString(),
    guardId: paymentData.guardId || '',
    date: paymentData.date || new Date().toISOString().split('T')[0],
    amount: paymentData.amount || 0,
    note: paymentData.note,
    type: paymentData.type || 'bonus',
    month: paymentData.month,
    created_at: new Date().toISOString()
  };
  
  paymentRecords.push(newPayment);
  return newPayment;
};

export const createPaymentRecord = async (paymentData: Partial<PaymentRecord>): Promise<PaymentRecord> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  return addPaymentRecord(paymentData);
};

export const fetchPaymentRecords = async (): Promise<PaymentRecord[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...paymentRecords];
};

// Attendance management functions
export const createAttendanceRecord = async (recordData: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const newRecord: AttendanceRecord = {
    id: Date.now().toString(),
    date: recordData.date || new Date().toISOString().split('T')[0],
    shiftId: recordData.shiftId || '',
    guardId: recordData.guardId || '',
    status: recordData.status || 'present',
    replacementGuardId: recordData.replacementGuardId,
    reassignedSiteId: recordData.reassignedSiteId,
    approvedBy: recordData.approvedBy,
    approvedAt: recordData.approvedAt,
    notes: recordData.notes,
    created_at: new Date().toISOString()
  };
  
  attendanceRecords.push(newRecord);
  return newRecord;
};

export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...attendanceRecords];
};

// Additional missing functions to fix build errors

// Site functions
export const fetchSite = async (id: string): Promise<Site | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return sites.find(site => site.id === id) || null;
};

export const getSiteById = (id: string): Site | undefined => {
  return sites.find(site => site.id === id);
};

export const fetchSiteMonthlyEarnings = async (siteId: string, month: string): Promise<SiteEarnings> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    totalShifts: 0,
    allocatedAmount: 0,
    guardCosts: 0,
    netEarnings: 0
  };
};

// Guard functions
export const fetchGuard = async (id: string): Promise<Guard | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return guards.find(guard => guard.id === id) || null;
};

export const getGuardById = (id: string): Guard | undefined => {
  return guards.find(guard => guard.id === id);
};

export const fetchGuardMonthlyStats = async (guardId: string, month: string): Promise<{ totalShifts: number, earnings: number, bonuses: number, deductions: number, netAmount: number, baseSalary: number }> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { 
    totalShifts: 0, 
    earnings: 0, 
    bonuses: 0, 
    deductions: 0, 
    netAmount: 0,
    baseSalary: 0 
  };
};

// Shift functions
export const fetchShifts = async (): Promise<Shift[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...shifts];
};

export const fetchShiftsBySite = async (siteId: string): Promise<Shift[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return shifts.filter(shift => shift.siteId === siteId);
};

export const getShiftsBySite = (siteId: string): Shift[] => {
  return shifts.filter(shift => shift.siteId === siteId);
};

export const createShift = async (shiftData: Partial<Shift>): Promise<Shift> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const newShift: Shift = {
    id: Date.now().toString(),
    siteId: shiftData.siteId || '',
    type: shiftData.type || 'day',
    guardId: shiftData.guardId || '',
    assignedGuardId: shiftData.assignedGuardId,
    locked: shiftData.locked || false,
    date: shiftData.date,
    created_at: new Date().toISOString()
  };
  shifts.push(newShift);
  return newShift;
};

export const updateShift = async (id: string, shiftData: Partial<Shift>): Promise<Shift> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = shifts.findIndex(shift => shift.id === id);
  if (index === -1) throw new Error('Shift not found');
  shifts[index] = { ...shifts[index], ...shiftData };
  return shifts[index];
};

export const deleteShift = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = shifts.findIndex(shift => shift.id === id);
  if (index === -1) throw new Error('Shift not found');
  shifts.splice(index, 1);
};

// Attendance functions
export const fetchAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return attendanceRecords.filter(record => record.date === date);
};

export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.date === date);
};

export const fetchAttendanceByGuard = async (guardId: string): Promise<AttendanceRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return attendanceRecords.filter(record => record.guardId === guardId);
};

export const fetchAttendanceByShift = async (shiftId: string): Promise<AttendanceRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return attendanceRecords.filter(record => record.shiftId === shiftId);
};

export const updateAttendanceRecord = async (id: string, recordData: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Attendance record not found');
  attendanceRecords[index] = { ...attendanceRecords[index], ...recordData };
  return attendanceRecords[index];
};

export const deleteAttendanceRecord = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = attendanceRecords.findIndex(record => record.id === id);
  if (index === -1) throw new Error('Attendance record not found');
  attendanceRecords.splice(index, 1);
};

export const isGuardMarkedPresentElsewhere = async (
  guardId: string, 
  date: string, 
  shiftType: 'day' | 'night', 
  excludeSiteId?: string
): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  // Mock implementation - always return false for now
  return false;
};

// Payment functions
export const fetchPaymentsByGuard = async (guardId: string): Promise<PaymentRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return paymentRecords.filter(payment => payment.guardId === guardId);
};

export const fetchPaymentsByMonth = async (month: string): Promise<PaymentRecord[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return paymentRecords.filter(payment => payment.month === month);
};

export const updatePaymentRecord = async (id: string, paymentData: Partial<PaymentRecord>): Promise<PaymentRecord> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = paymentRecords.findIndex(payment => payment.id === id);
  if (index === -1) throw new Error('Payment record not found');
  paymentRecords[index] = { ...paymentRecords[index], ...paymentData };
  return paymentRecords[index];
};

export const deletePaymentRecord = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const index = paymentRecords.findIndex(payment => payment.id === id);
  if (index === -1) throw new Error('Payment record not found');
  paymentRecords.splice(index, 1);
};

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Initialize with empty data
console.log('Local data service initialized with empty data');
