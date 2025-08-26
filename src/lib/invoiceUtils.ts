import { Site, StaffingSlot } from '@/types';
import { Invoice, InvoiceLineItem } from '@/types/invoice';
import { getUtilityChargesForSite } from './utilityChargesApi';

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

export async function generateInvoiceNumber(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data, error } = await supabase.rpc('get_next_invoice_number');
  
  if (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
  
  return data;
}

export async function calculateInvoiceFromSite(
  site: Site,
  periodFrom: string,
  periodTo: string,
  companySettings?: { company_name: string; gst_number?: string; personal_billing_names?: string[] },
  invoiceDate?: string,
  includeUtilities: boolean = true
): Promise<Omit<Invoice, 'id' | 'created_at' | 'status'>> {
  const lineItems: InvoiceLineItem[] = [];
  let subtotal = 0;

  // Calculate days in the billing period
  const fromDate = new Date(periodFrom);
  const toDate = new Date(periodTo);
  const timeDiff = toDate.getTime() - fromDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

      // Calculate line items from staffing slots - combine day and night for same role
  site.staffingSlots?.forEach((slot: StaffingSlot) => {
    const totalSlots = slot.daySlots + slot.nightSlots;
    
    if (totalSlots > 0) {
      // Use explicit rate type from the staffing slot
      let lineTotal: number;
      let quantity: number;
      let manDays: number;
      let monthlyRate: number | undefined;
      let ratePerSlot: number;

      if (slot.rateType === 'monthly') {
        // Monthly billing
        quantity = totalSlots;
        manDays = daysDiff;
        monthlyRate = slot.budgetPerSlot;
        ratePerSlot = 0;
        lineTotal = totalSlots * slot.budgetPerSlot;
      } else {
        // Shift-based billing
        quantity = totalSlots;
        manDays = daysDiff;
        monthlyRate = undefined;
        ratePerSlot = slot.budgetPerSlot;
        lineTotal = totalSlots * daysDiff * slot.budgetPerSlot;
      }

      // Generate description with day/night slot information
      let description = slot.role;
      if (slot.daySlots > 0 && slot.nightSlots > 0) {
        description += ` - [${slot.daySlots} Day, ${slot.nightSlots} Night]`;
      } else if (slot.daySlots > 0) {
        description += " - [Day]";
      } else if (slot.nightSlots > 0) {
        description += " - [Night]";
      }

      lineItems.push({
        id: slot.id,
        role: slot.role,
        shiftType: 'day', // Not relevant anymore since we're combining
        rateType: slot.rateType,
        quantity,
        manDays,
        ratePerSlot,
        monthlyRate,
        lineTotal,
        description,
        customDescription: slot.description
      });
      subtotal += lineTotal;
    }
  });

  // Add utility charges if requested
  if (includeUtilities) {
    try {
      const utilityCharges = await getUtilityChargesForSite(site.id);
      utilityCharges.forEach((utility) => {
        const amount = Number((utility as any).amount) || 0;
        const lineTotal = amount;
        lineItems.push({
          id: utility.id,
          role: 'Other Utility' as any,
          shiftType: 'day',
          rateType: 'utility',
          quantity: 1,
          manDays: 1,
          ratePerSlot: 0,
          monthlyRate: undefined,
          lineTotal,
          description: (utility as any).description
        });
        subtotal += lineTotal;
      });
    } catch (error) {
      console.error('Error fetching utility charges:', error);
      // Continue without utility charges if there's an error
    }
  }

  // Calculate GST with proper breakdown
  const gstCalculation = calculateGST(subtotal, site.gstType);

  // For personal billing, use assigned personal name or site organization name
  const billingCompanyName = site.gstType === 'PERSONAL' && site.personalBillingName 
    ? site.personalBillingName 
    : companySettings?.company_name || "Your Security Company";

  return {
    invoiceNumber: await generateInvoiceNumber(),
    siteId: site.id,
    siteName: site.name,
    siteGst: site.gstNumber,
    companyName: billingCompanyName,
    companyGst: site.gstType === 'PERSONAL' ? '' : (companySettings?.gst_number || ''),
    clientName: site.organizationName,
    clientAddress: [site.addressLine1, site.addressLine2, site.addressLine3].filter(Boolean).join(', '),
    invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
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