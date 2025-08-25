import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

import { Database } from '@/integrations/supabase/types';

type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];

export async function createInvoiceInDB(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice> {
  const insertData: InvoiceInsert = {
    invoice_number: invoice.invoiceNumber,
    site_id: invoice.siteId,
    site_name: invoice.siteName,
    site_gst: invoice.siteGst,
    company_name: invoice.companyName,
    company_gst: invoice.companyGst,
    client_name: invoice.clientName,
    client_address: invoice.clientAddress,
    invoice_date: invoice.invoiceDate,
    period_from: invoice.periodFrom,
    period_to: invoice.periodTo,
    line_items: invoice.lineItems as any,
    subtotal: invoice.subtotal,
    gst_type: invoice.gstType,
    gst_rate: invoice.gstRate,
    gst_amount: invoice.gstAmount,
    cgst_rate: invoice.cgstRate,
    cgst_amount: invoice.cgstAmount,
    sgst_rate: invoice.sgstRate,
    sgst_amount: invoice.sgstAmount,
    igst_rate: invoice.igstRate,
    igst_amount: invoice.igstAmount,
    total_amount: invoice.totalAmount,
    status: invoice.status,
    notes: invoice.notes
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }

  return convertDbRecordToInvoice(data);
}

export async function fetchInvoicesFromDB(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    throw new Error('Failed to fetch invoices');
  }

  return data.map(convertDbRecordToInvoice);
}

export async function fetchInvoiceByIdFromDB(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching invoice:', error);
    throw new Error('Failed to fetch invoice');
  }

  return convertDbRecordToInvoice(data);
}

export async function updateInvoiceInDB(id: string, updates: Partial<Omit<Invoice, 'id' | 'created_at'>>): Promise<Invoice> {
  const dbUpdates: any = {};
  
  // Map frontend fields to database fields
  if (updates.invoiceNumber) dbUpdates.invoice_number = updates.invoiceNumber;
  if (updates.siteId) dbUpdates.site_id = updates.siteId;
  if (updates.siteName) dbUpdates.site_name = updates.siteName;
  if (updates.siteGst !== undefined) dbUpdates.site_gst = updates.siteGst;
  if (updates.companyName) dbUpdates.company_name = updates.companyName;
  if (updates.companyGst !== undefined) dbUpdates.company_gst = updates.companyGst;
  if (updates.clientName) dbUpdates.client_name = updates.clientName;
  if (updates.clientAddress) dbUpdates.client_address = updates.clientAddress;
  if (updates.invoiceDate) dbUpdates.invoice_date = updates.invoiceDate;
  if (updates.periodFrom) dbUpdates.period_from = updates.periodFrom;
  if (updates.periodTo) dbUpdates.period_to = updates.periodTo;
  if (updates.lineItems) dbUpdates.line_items = updates.lineItems;
  if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
  if (updates.gstType) dbUpdates.gst_type = updates.gstType;
  if (updates.gstRate !== undefined) dbUpdates.gst_rate = updates.gstRate;
  if (updates.gstAmount !== undefined) dbUpdates.gst_amount = updates.gstAmount;
  if (updates.cgstRate !== undefined) dbUpdates.cgst_rate = updates.cgstRate;
  if (updates.cgstAmount !== undefined) dbUpdates.cgst_amount = updates.cgstAmount;
  if (updates.sgstRate !== undefined) dbUpdates.sgst_rate = updates.sgstRate;
  if (updates.sgstAmount !== undefined) dbUpdates.sgst_amount = updates.sgstAmount;
  if (updates.igstRate !== undefined) dbUpdates.igst_rate = updates.igstRate;
  if (updates.igstAmount !== undefined) dbUpdates.igst_amount = updates.igstAmount;
  if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from('invoices')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }

  return convertDbRecordToInvoice(data);
}

export async function deleteInvoiceFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
}

export async function checkSiteHasInvoiceForMonth(siteId: string, year: number, month: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('site_id', siteId)
    .gte('period_from', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('period_from', `${year}-${String(month + 1).padStart(2, '0')}-01`)
    .limit(1);

  if (error) {
    console.error('Error checking invoice existence:', error);
    return false;
  }

  return data && data.length > 0;
}

export async function checkMultipleSitesHaveInvoiceForMonth(siteIds: string[], year: number, month: number): Promise<Set<string>> {
  if (siteIds.length === 0) return new Set();
  
  const { data, error } = await supabase
    .from('invoices')
    .select('site_id')
    .in('site_id', siteIds)
    .gte('period_from', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('period_from', `${year}-${String(month + 1).padStart(2, '0')}-01`);

  if (error) {
    console.error('Error checking invoice existence for multiple sites:', error);
    return new Set();
  }

  return new Set(data?.map(record => record.site_id) || []);
}

function convertDbRecordToInvoice(record: InvoiceRow): Invoice {
  return {
    id: record.id,
    invoiceNumber: record.invoice_number,
    siteId: record.site_id,
    siteName: record.site_name,
    siteGst: record.site_gst,
    companyName: record.company_name,
    companyGst: record.company_gst,
    clientName: record.client_name,
    clientAddress: record.client_address,
    invoiceDate: record.invoice_date,
    periodFrom: record.period_from,
    periodTo: record.period_to,
    lineItems: record.line_items as any,
    subtotal: record.subtotal,
    gstType: record.gst_type as any,
    gstRate: record.gst_rate,
    gstAmount: record.gst_amount,
    cgstRate: record.cgst_rate,
    cgstAmount: record.cgst_amount,
    sgstRate: record.sgst_rate,
    sgstAmount: record.sgst_amount,
    igstRate: record.igst_rate,
    igstAmount: record.igst_amount,
    totalAmount: record.total_amount,
    status: record.status as any,
    notes: record.notes,
    created_at: record.created_at
  };
}