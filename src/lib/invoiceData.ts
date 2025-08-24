import { Invoice } from '@/types/invoice';

// Mock invoice data for demonstration
export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-20240823-001',
    siteId: '1',
    siteName: 'Corporate Office Complex',
    companyName: 'SecureGuard Services Pvt Ltd',
    companyGst: '29ABCDE1234F1Z5',
    clientName: 'TechCorp Industries',
    clientAddress: '123 Business District, Tech Park, Bangalore - 560001',
    invoiceDate: '2024-08-23',
    periodFrom: '2024-08-01',
    periodTo: '2024-08-31',
    lineItems: [
      {
        id: '1-day',
        role: 'Security Guard',
        shiftType: 'day',
        rateType: 'shift',
        quantity: 10,
        manDays: 30,
        ratePerSlot: 1500,
        lineTotal: 15000,
        description: 'Security Guard - Day Shift'
      },
      {
        id: '1-night',
        role: 'Security Guard',
        shiftType: 'night',
        rateType: 'shift',
        quantity: 8,
        manDays: 30,
        ratePerSlot: 1800,
        lineTotal: 14400,
        description: 'Security Guard - Night Shift'
      },
      {
        id: '2-day',
        role: 'Supervisor',
        shiftType: 'day',
        rateType: 'monthly',
        quantity: 2,
        manDays: 30,
        monthlyRate: 45000,
        ratePerSlot: 2500,
        lineTotal: 5000,
        description: 'Supervisor - Day Shift'
      }
    ],
    subtotal: 34400,
    gstType: 'GST',
    gstRate: 18,
    gstAmount: 6192,
    cgstRate: 9,
    cgstAmount: 3096,
    sgstRate: 9,
    sgstAmount: 3096,
    igstRate: 0,
    igstAmount: 0,
    totalAmount: 40592,
    status: 'sent',
    notes: 'Monthly security services for August 2024',
    created_at: '2024-08-23T10:00:00Z'
  },
  {
    id: '2',
    invoiceNumber: 'INV-20240822-002',
    siteId: '2',
    siteName: 'Manufacturing Plant',
    companyName: 'SecureGuard Services Pvt Ltd',
    companyGst: '29ABCDE1234F1Z5',
    clientName: 'Industrial Corp',
    clientAddress: '456 Industrial Area, Sector 5, Gurgaon - 122001',
    invoiceDate: '2024-08-22',
    periodFrom: '2024-08-01',
    periodTo: '2024-08-31',
    lineItems: [
      {
        id: '3-day',
        role: 'Security Guard',
        shiftType: 'day',
        rateType: 'shift',
        quantity: 15,
        manDays: 30,
        ratePerSlot: 1400,
        lineTotal: 21000,
        description: 'Security Guard - Day Shift'
      },
      {
        id: '3-night',
        role: 'Security Guard',
        shiftType: 'night',
        rateType: 'shift',
        quantity: 15,
        manDays: 30,
        ratePerSlot: 1700,
        lineTotal: 25500,
        description: 'Security Guard - Night Shift'
      }
    ],
    subtotal: 46500,
    gstType: 'RCM',
    gstRate: 18,
    gstAmount: 0,
    cgstRate: 9,
    cgstAmount: 0,
    sgstRate: 9,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalAmount: 46500,
    status: 'paid',
    created_at: '2024-08-22T14:30:00Z'
  }
];

// Local storage key
const INVOICES_STORAGE_KEY = 'securityApp_invoices';

export function getInvoices(): Invoice[] {
  const stored = localStorage.getItem(INVOICES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored invoices:', error);
    }
  }
  return mockInvoices;
}

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
}

export function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Invoice {
  const newInvoice: Invoice = {
    ...invoice,
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), // More unique ID
    created_at: new Date().toISOString(),
    // Ensure all GST fields have valid numbers
    gstRate: Number(invoice.gstRate) || 0,
    gstAmount: Number(invoice.gstAmount) || 0,
    cgstRate: Number(invoice.cgstRate) || 0,
    cgstAmount: Number(invoice.cgstAmount) || 0,
    sgstRate: Number(invoice.sgstRate) || 0,
    sgstAmount: Number(invoice.sgstAmount) || 0,
    igstRate: Number(invoice.igstRate) || 0,
    igstAmount: Number(invoice.igstAmount) || 0,
    totalAmount: Number(invoice.totalAmount) || 0
  };

  const invoices = getInvoices();
  
  // Check for duplicates and prevent adding if already exists
  const existingInvoice = invoices.find(inv => inv.id === newInvoice.id);
  if (existingInvoice) {
    console.warn('Invoice with this ID already exists:', newInvoice.id);
    return existingInvoice;
  }
  
  invoices.unshift(newInvoice);
  saveInvoices(invoices);

  return newInvoice;
}

export function updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
  const invoices = getInvoices();
  const index = invoices.findIndex(inv => inv.id === id);
  
  if (index === -1) return null;

  const updatedInvoice = { ...invoices[index], ...updates };
  invoices[index] = updatedInvoice;
  saveInvoices(invoices);

  return updatedInvoice;
}

export function deleteInvoice(id: string): boolean {
  const invoices = getInvoices();
  const filteredInvoices = invoices.filter(inv => inv.id !== id);
  
  if (filteredInvoices.length === invoices.length) return false;

  saveInvoices(filteredInvoices);
  return true;
}

export function getInvoiceById(id: string): Invoice | null {
  const invoices = getInvoices();
  return invoices.find(inv => inv.id === id) || null;
}