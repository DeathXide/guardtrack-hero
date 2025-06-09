
import { supabase } from './client';
import { convertPaymentFromDB, convertPaymentToDB } from './converters';
import { PaymentRecord, PaymentRecordDB } from '@/types';

export const fetchPaymentRecords = async (): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*');

  if (error) {
    console.error('Error fetching payment records:', error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const fetchPaymentsByGuard = async (guardId: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('guard_id', guardId);

  if (error) {
    console.error(`Error fetching payments for guard ${guardId}:`, error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const fetchPaymentsByMonth = async (month: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('month', month);

  if (error) {
    console.error(`Error fetching payments for month ${month}:`, error);
    throw error;
  }

  return (data as PaymentRecordDB[]).map(convertPaymentFromDB);
};

export const createPaymentRecord = async (record: Partial<PaymentRecord> & { guardId: string }): Promise<PaymentRecord> => {
  const { data, error } = await supabase
    .from('payment_records')
    .insert(convertPaymentToDB(record))
    .select()
    .single();

  if (error) {
    console.error('Error creating payment record:', error);
    throw error;
  }

  return convertPaymentFromDB(data as PaymentRecordDB);
};

export const updatePaymentRecord = async (id: string, record: Partial<PaymentRecord>): Promise<PaymentRecord> => {
  const { data, error } = await supabase
    .from('payment_records')
    .update(convertPaymentToDB(record))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating payment record with id ${id}:`, error);
    throw error;
  }

  return convertPaymentFromDB(data as PaymentRecordDB);
};

export const deletePaymentRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('payment_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting payment record with id ${id}:`, error);
    throw error;
  }
};
