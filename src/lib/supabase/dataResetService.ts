import { supabase } from './client';

export const deleteAllData = async (): Promise<void> => {
  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete all attendance records first
    const { error: attendanceError } = await supabase
      .from('attendance_records')
      .delete()
      .neq('id', ''); // This deletes all records
    
    if (attendanceError) {
      console.error('Error deleting attendance records:', attendanceError);
      throw attendanceError;
    }

    // 2. Delete all shifts
    const { error: shiftsError } = await supabase
      .from('shifts')
      .delete()
      .neq('id', ''); // This deletes all records
    
    if (shiftsError) {
      console.error('Error deleting shifts:', shiftsError);
      throw shiftsError;
    }

    // 3. Delete all payment records
    const { error: paymentsError } = await supabase
      .from('payment_records')
      .delete()
      .neq('id', ''); // This deletes all records
    
    if (paymentsError) {
      console.error('Error deleting payment records:', paymentsError);
      throw paymentsError;
    }

    // 4. Delete all guards
    const { error: guardsError } = await supabase
      .from('guards')
      .delete()
      .neq('id', ''); // This deletes all records
    
    if (guardsError) {
      console.error('Error deleting guards:', guardsError);
      throw guardsError;
    }

    // 5. Delete all sites
    const { error: sitesError } = await supabase
      .from('sites')
      .delete()
      .neq('id', ''); // This deletes all records
    
    if (sitesError) {
      console.error('Error deleting sites:', sitesError);
      throw sitesError;
    }

    console.log('All data deleted successfully');
  } catch (error) {
    console.error('Error during data deletion:', error);
    throw error;
  }
};