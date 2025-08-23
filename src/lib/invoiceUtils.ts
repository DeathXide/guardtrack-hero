import { Site, StaffingSlot } from '@/types';
import { Invoice, InvoiceLineItem } from '@/types/invoice';

export const GST_RATES = {
  GST: 18, // Standard GST rate for security services
  NGST: 0, // No GST
  RCM: 18, // Reverse Charge Mechanism - same rate but different handling
  PERSONAL: 0 // Personal billing - no GST
};

export function calculateGST(amount: number, gstType: string): { gstRate: number; gstAmount: number; totalAmount: number } {
  const gstRate = GST_RATES[gstType as keyof typeof GST_RATES] || 0;
  const gstAmount = gstType === 'RCM' ? 0 : (amount * gstRate) / 100; // RCM - client pays GST
  const totalAmount = amount + gstAmount;

  return {
    gstRate,
    gstAmount,
    totalAmount
  };
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `INV-${year}${month}${day}-${random}`;
}

export function calculateInvoiceFromSite(
  site: Site,
  periodFrom: string,
  periodTo: string,
  companyName: string = "Your Security Company"
): Omit<Invoice, 'id' | 'created_at' | 'status'> {
  const lineItems: InvoiceLineItem[] = [];
  let subtotal = 0;

  // Calculate line items from staffing slots
  site.staffingSlots?.forEach((slot: StaffingSlot) => {
    if (slot.daySlots > 0) {
      const dayLineTotal = slot.daySlots * slot.budgetPerSlot;
      lineItems.push({
        id: `${slot.id}-day`,
        role: slot.role,
        shiftType: 'day',
        quantity: slot.daySlots,
        ratePerSlot: slot.budgetPerSlot,
        lineTotal: dayLineTotal,
        description: `${slot.role} - Day Shift`
      });
      subtotal += dayLineTotal;
    }

    if (slot.nightSlots > 0) {
      const nightLineTotal = slot.nightSlots * slot.budgetPerSlot;
      lineItems.push({
        id: `${slot.id}-night`,
        role: slot.role,
        shiftType: 'night',
        quantity: slot.nightSlots,
        ratePerSlot: slot.budgetPerSlot,
        lineTotal: nightLineTotal,
        description: `${slot.role} - Night Shift`
      });
      subtotal += nightLineTotal;
    }
  });

  // Calculate GST
  const { gstRate, gstAmount, totalAmount } = calculateGST(subtotal, site.gstType);

  return {
    invoiceNumber: generateInvoiceNumber(),
    siteId: site.id,
    siteName: site.name,
    companyName,
    companyGst: site.gstNumber || '',
    clientName: site.organizationName,
    clientAddress: `${site.addressLine1}, ${site.addressLine2 ? site.addressLine2 + ', ' : ''}${site.addressLine3}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    periodFrom,
    periodTo,
    lineItems,
    subtotal,
    gstType: site.gstType,
    gstRate,
    gstAmount,
    totalAmount
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.toUpperCase();
}