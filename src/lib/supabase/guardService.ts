
import { supabase } from './client';
import { convertGuardFromDB, convertGuardToDB } from './converters';
import { Guard, GuardDB } from '@/types';

export const fetchGuards = async (): Promise<Guard[]> => {
  const { data, error } = await supabase
    .from('guards')
    .select('*');

  if (error) {
    console.error('Error fetching guards:', error);
    throw error;
  }

  return (data as GuardDB[]).map(convertGuardFromDB);
};

export const fetchGuard = async (id: string): Promise<Guard | null> => {
  const { data, error } = await supabase
    .from('guards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching guard with id ${id}:`, error);
    return null;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const createGuard = async (guard: Partial<Guard>): Promise<Guard> => {
  const { data, error } = await supabase
    .from('guards')
    .insert(convertGuardToDB(guard))
    .select()
    .single();

  if (error) {
    console.error('Error creating guard:', error);
    throw error;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const updateGuard = async (id: string, guard: Partial<Guard>): Promise<Guard> => {
  const { data, error } = await supabase
    .from('guards')
    .update(convertGuardToDB(guard))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating guard with id ${id}:`, error);
    throw error;
  }

  return convertGuardFromDB(data as GuardDB);
};

export const deleteGuard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('guards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting guard with id ${id}:`, error);
    throw error;
  }
};

export const calculateDailyRate = (guard: Guard | undefined): number => {
  if (!guard || !guard.payRate) return 0;
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  return guard.payRate / daysInMonth;
};

export const calculateMonthlyEarnings = async (guard: Guard | undefined, currentDate: Date): Promise<number> => {
  if (!guard) return 0;
  
  const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const { data, error } = await supabase.rpc('calculate_guard_monthly_earnings', {
    guard_uuid: guard.id,
    month_date: month
  });

  if (error) {
    console.error('Error calculating monthly earnings:', error);
    return 0;
  }

  return data && data.length > 0 ? Number(data[0].earnings) : 0;
};

export const fetchGuardMonthlyStats = async (guardId: string, month: string): Promise<{ totalShifts: number, earnings: number }> => {
  const { data, error } = await supabase.rpc('calculate_guard_monthly_earnings', {
    guard_uuid: guardId,
    month_date: month
  });

  if (error) {
    console.error('Error fetching guard monthly stats:', error);
    return { totalShifts: 0, earnings: 0 };
  }

  return data && data.length > 0 
    ? { totalShifts: data[0].total_shifts, earnings: Number(data[0].earnings) } 
    : { totalShifts: 0, earnings: 0 };
};
