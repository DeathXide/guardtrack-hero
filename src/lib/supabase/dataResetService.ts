import { supabase } from '@/integrations/supabase/client';

export const deleteAllData = async (): Promise<void> => {
  try {
    console.log('Starting data deletion process...');
    
    // Delete in order to respect foreign key constraints
    
    // 1. Try to delete all attendance records first
    try {
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .delete()
        .neq('id', ''); // This deletes all records
      
      if (attendanceError) {
        console.warn('Could not delete attendance records:', attendanceError.message);
      } else {
        console.log('Deleted attendance records');
      }
    } catch (e) {
      console.warn('Attendance records table may not exist');
    }

    // 2. Try to delete all shifts
    try {
      const { error: shiftsError } = await supabase
        .from('shifts')
        .delete()
        .neq('id', ''); // This deletes all records
      
      if (shiftsError) {
        console.warn('Could not delete shifts:', shiftsError.message);
      } else {
        console.log('Deleted shifts');
      }
    } catch (e) {
      console.warn('Shifts table may not exist');
    }

    // 3. Try to delete all payment records
    try {
      const { error: paymentsError } = await supabase
        .from('payment_records')
        .delete()
        .neq('id', ''); // This deletes all records
      
      if (paymentsError) {
        console.warn('Could not delete payment records:', paymentsError.message);
      } else {
        console.log('Deleted payment records');
      }
    } catch (e) {
      console.warn('Payment records table may not exist');
    }

    // 4. Try to delete all guards
    try {
      const { error: guardsError } = await supabase
        .from('guards')
        .delete()
        .neq('id', ''); // This deletes all records
      
      if (guardsError) {
        console.warn('Could not delete guards:', guardsError.message);
      } else {
        console.log('Deleted guards');
      }
    } catch (e) {
      console.warn('Guards table may not exist');
    }

    // 5. Try to delete all sites
    try {
      const { error: sitesError } = await supabase
        .from('sites')
        .delete()
        .neq('id', ''); // This deletes all records
      
      if (sitesError) {
        console.warn('Could not delete sites:', sitesError.message);
      } else {
        console.log('Deleted sites');
      }
    } catch (e) {
      console.warn('Sites table may not exist');
    }

    console.log('Data deletion process completed');
  } catch (error) {
    console.error('Error during data deletion:', error);
    throw error;
  }
};