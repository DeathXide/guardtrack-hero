
import { supabase } from './client';
import { convertShiftFromDB, convertShiftToDB } from './converters';
import { Shift, ShiftDB } from '@/types';

export const fetchShifts = async (): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*');

  if (error) {
    console.error('Error fetching shifts:', error);
    throw error;
  }

  return (data as ShiftDB[]).map(convertShiftFromDB);
};

export const fetchShiftsBySite = async (siteId: string): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('site_id', siteId);

  if (error) {
    console.error(`Error fetching shifts for site ${siteId}:`, error);
    throw error;
  }

  return (data as ShiftDB[]).map(convertShiftFromDB);
};

export const createShift = async (shift: Partial<Shift>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .insert(convertShiftToDB(shift))
    .select()
    .single();

  if (error) {
    console.error('Error creating shift:', error);
    throw error;
  }

  return convertShiftFromDB(data as ShiftDB);
};

export const updateShift = async (id: string, shift: Partial<Shift>): Promise<Shift> => {
  const { data, error } = await supabase
    .from('shifts')
    .update(convertShiftToDB(shift))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating shift with id ${id}:`, error);
    throw error;
  }

  return convertShiftFromDB(data as ShiftDB);
};

export const deleteShift = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting shift with id ${id}:`, error);
    throw error;
  }
};
