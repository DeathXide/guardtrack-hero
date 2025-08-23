import { Site, StaffingSlot } from '@/types';
import { Invoice, InvoiceLineItem } from '@/types/invoice';

export const GST_RATES = {
  GST: 18, // Standard GST rate for security services (CGST 9% + SGST 9%)
  IGST: 18, // Inter-state GST (IGST 18%)
  NGST: 0, // No GST
  RCM: 18, // Reverse Charge Mechanism - same rate but different handling
  PERSONAL: 0 // Personal billing - no GST
};

export function calculateGST(amount: number, gstType: string): { 
  gstRate: number; 
  gstAmount: number; 
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
} {
  const gstRate = GST_RATES[gstType as keyof typeof GST_RATES] || 0;
  
  let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0, igstRate = 0, igstAmount = 0;
  let totalGstAmount = 0;

  // Ensure amount is a valid number
  const validAmount = Number(amount) || 0;

  if (gstType === 'GST') {
    // For intra-state: CGST + SGST (9% each = 18% total)
    cgstRate = Number((gstRate / 2).toFixed(2)); // 9%
    sgstRate = Number((gstRate / 2).toFixed(2)); // 9%
    cgstAmount = Number(((validAmount * cgstRate) / 100).toFixed(2));
    sgstAmount = Number(((validAmount * sgstRate) / 100).toFixed(2));
    totalGstAmount = cgstAmount + sgstAmount;
  } else if (gstType === 'IGST') {
    // For inter-state: IGST (18% total)
    igstRate = gstRate;
    igstAmount = Number(((validAmount * igstRate) / 100).toFixed(2));
    totalGstAmount = igstAmount;
  } else if (gstType === 'RCM') {
    // RCM - client pays GST, but we show the breakdown
    cgstRate = Number((gstRate / 2).toFixed(2));
    sgstRate = Number((gstRate / 2).toFixed(2));
    totalGstAmount = 0; // Client pays, not added to invoice total
  }
  // NGST and PERSONAL have 0% GST

  const totalAmount = Number((validAmount + totalGstAmount).toFixed(2));

  return {
    gstRate: Number(gstRate.toFixed(2)),
    gstAmount: Number(totalGstAmount.toFixed(2)),
    cgstRate: Number(cgstRate.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstRate: Number(sgstRate.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstRate: Number(igstRate.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
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

  // Calculate GST with proper breakdown
  const gstCalculation = calculateGST(subtotal, site.gstType);

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
    gstRate: gstCalculation.gstRate,
    gstAmount: gstCalculation.gstAmount,
    cgstRate: gstCalculation.cgstRate,
    cgstAmount: gstCalculation.cgstAmount,
    sgstRate: gstCalculation.sgstRate,
    sgstAmount: gstCalculation.sgstAmount,
    igstRate: gstCalculation.igstRate,
    igstAmount: gstCalculation.igstAmount,
    totalAmount: gstCalculation.totalAmount
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