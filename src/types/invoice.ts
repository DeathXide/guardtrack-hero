export interface InvoiceLineItem {
  id: string;
  role: 'Security Guard' | 'Supervisor' | 'Housekeeping';
  shiftType: 'day' | 'night';
  quantity: number;
  ratePerSlot: number;
  lineTotal: number;
  description?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  siteId: string;
  siteName: string;
  siteGst?: string;
  companyName: string;
  companyGst: string;
  clientName: string;
  clientAddress: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gstType: 'GST' | 'IGST' | 'NGST' | 'RCM' | 'PERSONAL';
  gstRate: number;
  gstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
}

export interface InvoiceFormData {
  siteId: string;
  periodFrom: string;
  periodTo: string;
  notes?: string;
}