import { User, Site, Guard, Shift, AttendanceRecord, MonthlyEarning } from '@/types';

// Mock Users
export const users: User[] = [
  {
    id: 'u1',
    name: 'John Admin',
    email: 'admin@secureguard.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=John+Admin&background=0D8ABC&color=fff'
  },
  {
    id: 'u2',
    name: 'Sarah Supervisor',
    email: 'sarah@secureguard.com',
    role: 'supervisor',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Supervisor&background=0D8ABC&color=fff'
  },
  {
    id: 'u3',
    name: 'Mike Guard',
    email: 'mike@secureguard.com',
    role: 'guard',
    avatar: 'https://ui-avatars.com/api/?name=Mike+Guard&background=0D8ABC&color=fff'
  }
];

// Mock Sites
export const sites: Site[] = [
  {
    id: 's1',
    name: 'Downtown Office',
    location: '123 Main St, Downtown',
    supervisorId: 'u2',
    daySlots: 3,
    nightSlots: 2
  },
  {
    id: 's2',
    name: 'Tech Park',
    location: '456 Innovation Blvd, Tech District',
    supervisorId: 'u2',
    daySlots: 4,
    nightSlots: 3
  },
  {
    id: 's3',
    name: 'Shopping Mall',
    location: '789 Retail Ave, Shopping District',
    supervisorId: 'u2',
    daySlots: 5,
    nightSlots: 4
  }
];

// Mock Guards with added payRate
export const guards: Guard[] = [
  {
    id: 'g1',
    name: 'Mike Johnson',
    email: 'mike@secureguard.com',
    phone: '555-1234',
    badgeNumber: 'B001',
    avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=0D8ABC&color=fff',
    status: 'active',
    payRate: 15000, // Monthly pay rate
    monthlyEarnings: {}
  },
  {
    id: 'g2',
    name: 'Lisa Chen',
    email: 'lisa@secureguard.com',
    phone: '555-2345',
    badgeNumber: 'B002',
    avatar: 'https://ui-avatars.com/api/?name=Lisa+Chen&background=0D8ABC&color=fff',
    status: 'active',
    payRate: 16000, // Monthly pay rate
    monthlyEarnings: {}
  },
  {
    id: 'g3',
    name: 'Robert Smith',
    email: 'robert@secureguard.com',
    phone: '555-3456',
    badgeNumber: 'B003',
    avatar: 'https://ui-avatars.com/api/?name=Robert+Smith&background=0D8ABC&color=fff',
    status: 'active',
    payRate: 14800, // Monthly pay rate
    monthlyEarnings: {}
  },
  {
    id: 'g4',
    name: 'Aisha Patel',
    email: 'aisha@secureguard.com',
    phone: '555-4567',
    badgeNumber: 'B004',
    avatar: 'https://ui-avatars.com/api/?name=Aisha+Patel&background=0D8ABC&color=fff',
    status: 'active',
    payRate: 17000, // Monthly pay rate
    monthlyEarnings: {}
  },
  {
    id: 'g5',
    name: 'Carlos Rodriguez',
    email: 'carlos@secureguard.com',
    phone: '555-5678',
    badgeNumber: 'B005',
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=0D8ABC&color=fff',
    status: 'active',
    payRate: 16500, // Monthly pay rate
    monthlyEarnings: {}
  },
  {
    id: 'g6',
    name: 'Emma Wilson',
    email: 'emma@secureguard.com',
    phone: '555-6789',
    badgeNumber: 'B006',
    avatar: 'https://ui-avatars.com/api/?name=Emma+Wilson&background=0D8ABC&color=fff',
    status: 'inactive',
    payRate: 15000, // Monthly pay rate
    monthlyEarnings: {}
  }
];

// Mock Shifts
export const shifts: Shift[] = [
  // Downtown Office Day Shifts
  { id: 'sh1', siteId: 's1', type: 'day', guardId: 'g1' },
  { id: 'sh2', siteId: 's1', type: 'day', guardId: 'g2' },
  { id: 'sh3', siteId: 's1', type: 'day', guardId: 'g3' },
  
  // Downtown Office Night Shifts
  { id: 'sh4', siteId: 's1', type: 'night', guardId: 'g4' },
  { id: 'sh5', siteId: 's1', type: 'night', guardId: 'g5' },
  
  // Tech Park Day Shifts
  { id: 'sh6', siteId: 's2', type: 'day', guardId: 'g1' },
  { id: 'sh7', siteId: 's2', type: 'day', guardId: 'g2' },
  { id: 'sh8', siteId: 's2', type: 'day', guardId: 'g3' },
  { id: 'sh9', siteId: 's2', type: 'day', guardId: 'g4' },
  
  // Tech Park Night Shifts
  { id: 'sh10', siteId: 's2', type: 'night', guardId: 'g5' },
  { id: 'sh11', siteId: 's2', type: 'night', guardId: 'g1' },
  { id: 'sh12', siteId: 's2', type: 'night', guardId: 'g2' }
];

// Function to generate dates
const getDateString = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Mock Attendance Records (last 7 days)
export const generateAttendanceRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  
  // For each of the last 7 days
  for (let day = 6; day >= 0; day--) {
    const dateStr = getDateString(day);
    
    // For each shift, create an attendance record
    shifts.forEach((shift, index) => {
      // Randomly determine if the guard was present or absent
      const status = Math.random() > 0.15 ? 'present' : 'absent';
      
      const record: AttendanceRecord = {
        id: `ar-${dateStr}-${shift.id}`,
        date: dateStr,
        shiftId: shift.id,
        guardId: shift.guardId,
        status,
        approvedBy: 'u1',
        approvedAt: new Date().toISOString(),
        notes: ''
      };
      
      // If absent, randomly assign a replacement
      if (status === 'absent') {
        // Find a guard who is not the original guard
        const availableGuards = guards.filter(g => g.id !== shift.guardId && g.status === 'active');
        if (availableGuards.length > 0) {
          const replacementGuard = availableGuards[Math.floor(Math.random() * availableGuards.length)];
          record.status = 'replaced';
          record.replacementGuardId = replacementGuard.id;
          record.notes = `${shift.guardId} was absent. Replaced by ${replacementGuard.id}`;
        }
      }
      
      records.push(record);
    });
  }
  
  return records;
};

export const attendanceRecords = generateAttendanceRecords();

// Helper Functions
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

// New function to check if a guard is marked present anywhere for a given date and shift type
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

// New function to calculate guard's daily earnings
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

// New function to get guard's total deductions
export const getGuardDeductions = (guardId: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.paymentHistory) return 0;
  
  const deductions = guard.paymentHistory.filter(payment => payment.type === 'deduction');
  return deductions.reduce((total, payment) => total + payment.amount, 0);
};

// New function to get guard's total bonuses
export const getGuardBonuses = (guardId: string): number => {
  const guard = getGuardById(guardId);
  if (!guard || !guard.paymentHistory) return 0;
  
  const bonuses = guard.paymentHistory.filter(payment => payment.type === 'bonus');
  return bonuses.reduce((total, payment) => total + payment.amount, 0);
};
