
// Local service that replaces all Supabase functionality
export * from './data';

// Re-export specific functions with the same names as Supabase service
export {
  fetchSites,
  fetchSite,
  createSite,
  updateSite,
  deleteSite,
  fetchGuards,
  fetchGuard,
  createGuard,
  updateGuard,
  deleteGuard,
  fetchShifts,
  fetchShiftsBySite,
  createShift,
  updateShift,
  deleteShift,
  fetchAttendanceRecords,
  fetchAttendanceByDate,
  fetchAttendanceByGuard,
  fetchAttendanceByShift,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  isGuardMarkedPresentElsewhere,
  fetchSiteMonthlyEarnings,
  fetchPaymentRecords,
  fetchPaymentsByGuard,
  fetchPaymentsByMonth,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord,
  fetchGuardMonthlyStats,
  formatCurrency
} from './data';
