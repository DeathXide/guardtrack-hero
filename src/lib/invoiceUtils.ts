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

// ─── Precision helpers ──────────────────────────────────────────
// Round to paisa (2 decimal places) — the ONLY rounding function used
function roundToPaisa(value: number): number {
  return Math.round(value * 100) / 100;
}

// Count days between two date strings (inclusive of both start and end)
function countDaysInclusive(from: string, to: string): number {
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T00:00:00');
  const msPerDay = 86400000;
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1;
}

// ─── GST Calculation ────────────────────────────────────────────
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
  const validAmount = Number(amount) || 0;

  let cgstRate = 0, cgstAmount = 0;
  let sgstRate = 0, sgstAmount = 0;
  let igstRate = 0, igstAmount = 0;
  let totalGstAmount = 0;

  if (gstType === 'GST') {
    cgstRate = gstRate / 2; // 9%
    sgstRate = gstRate / 2; // 9%
    cgstAmount = roundToPaisa((validAmount * cgstRate) / 100);
    sgstAmount = roundToPaisa((validAmount * sgstRate) / 100);
    totalGstAmount = cgstAmount + sgstAmount;
  } else if (gstType === 'IGST') {
    igstRate = gstRate;
    igstAmount = roundToPaisa((validAmount * igstRate) / 100);
    totalGstAmount = igstAmount;
  } else if (gstType === 'RCM') {
    // RCM — calculated for display but NOT added to invoice total
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = roundToPaisa((validAmount * cgstRate) / 100);
    sgstAmount = roundToPaisa((validAmount * sgstRate) / 100);
    totalGstAmount = 0; // Recipient is liable
  }
  // NGST and PERSONAL → 0% GST

  const totalAmount = roundToPaisa(validAmount + totalGstAmount);

  return {
    gstRate,
    gstAmount: totalGstAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalAmount,
  };
}

// ─── Invoice Number ─────────────────────────────────────────────
export async function generateInvoiceNumber(periodFrom?: string): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');

  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    p_invoice_date: periodFrom || new Date().toISOString().split('T')[0]
  });

  if (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }

  return data;
}

// ─── Invoice from Staffing Config (existing behavior) ───────────
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

  // Calculate days using timezone-safe method
  const daysDiff = countDaysInclusive(periodFrom, periodTo);

  // Build line items from staffing requirements
  site.staffingSlots?.forEach((slot: StaffingSlot) => {
    const totalSlots = slot.daySlots + slot.nightSlots;

    if (totalSlots > 0) {
      let lineTotal: number;
      let quantity: number;
      let manDays: number;
      let monthlyRate: number | undefined;
      let ratePerSlot: number;

      if (slot.rateType === 'monthly') {
        quantity = totalSlots;
        manDays = daysDiff;
        monthlyRate = slot.budgetPerSlot;
        ratePerSlot = 0;
        lineTotal = roundToPaisa(totalSlots * slot.budgetPerSlot);
      } else {
        quantity = totalSlots;
        manDays = daysDiff;
        monthlyRate = undefined;
        ratePerSlot = slot.budgetPerSlot;
        lineTotal = roundToPaisa(totalSlots * daysDiff * slot.budgetPerSlot);
      }

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
        shiftType: 'day',
        rateType: slot.rateType,
        quantity,
        manDays,
        ratePerSlot,
        monthlyRate,
        lineTotal,
        description,
        customDescription: slot.description,
        daySlots: slot.daySlots,
        nightSlots: slot.nightSlots,
      });
      subtotal += lineTotal;
    }
  });

  // Utility charges
  if (includeUtilities) {
    try {
      const utilityCharges = await getUtilityChargesForSite(site.id);
      utilityCharges.forEach((utility) => {
        const lineTotal = roundToPaisa(Number((utility as any).amount) || 0);
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
          description: (utility as any).description,
        });
        subtotal += lineTotal;
      });
    } catch (error) {
      console.error('Error fetching utility charges:', error);
    }
  }

  // Round subtotal before GST to avoid compounding errors
  subtotal = roundToPaisa(subtotal);
  const gstCalculation = calculateGST(subtotal, site.gstType);

  const billingCompanyName = site.gstType === 'PERSONAL' && site.personalBillingName
    ? site.personalBillingName
    : companySettings?.company_name || "Your Security Company";

  return {
    invoiceNumber: 'PREVIEW',
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
    totalAmount: gstCalculation.totalAmount,
  };
}

// ─── Invoice from Actual Attendance ─────────────────────────────
// Bills only for slots where guards were actually present
export async function calculateInvoiceFromAttendance(
  site: Site,
  periodFrom: string,
  periodTo: string,
  companySettings?: { company_name: string; gst_number?: string; personal_billing_names?: string[] },
  invoiceDate?: string,
  includeUtilities: boolean = true
): Promise<Omit<Invoice, 'id' | 'created_at' | 'status'> & { pendingSlots: number }> {
  const { supabase } = await import('@/integrations/supabase/client');

  // Fetch all slots for this site in the billing period
  const { data: slots, error } = await supabase
    .from('daily_attendance_slots')
    .select('role_type, shift_type, pay_rate, is_present, attendance_date')
    .eq('site_id', site.id)
    .gte('attendance_date', periodFrom)
    .lte('attendance_date', periodTo);

  if (error) throw error;

  // Count pending slots (is_present = null) for warning
  const pendingSlots = (slots || []).filter(s => s.assigned_guard_id !== null && s.is_present === null).length;

  // Group present slots by role_type to build line items
  const roleGroups = new Map<string, { dayPresent: number; nightPresent: number; totalPayRate: number; count: number }>();

  for (const slot of slots || []) {
    if (slot.is_present !== true) continue; // Only bill for present guards

    const key = slot.role_type;
    if (!roleGroups.has(key)) {
      roleGroups.set(key, { dayPresent: 0, nightPresent: 0, totalPayRate: 0, count: 0 });
    }
    const group = roleGroups.get(key)!;
    if (slot.shift_type === 'day') group.dayPresent++;
    else group.nightPresent++;
    group.totalPayRate += Number(slot.pay_rate || 0);
    group.count++;
  }

  const lineItems: InvoiceLineItem[] = [];
  let subtotal = 0;

  for (const [roleType, group] of roleGroups) {
    const totalPresent = group.dayPresent + group.nightPresent;
    if (totalPresent === 0) continue;

    // Average rate across all present slots for this role (handles mixed rates)
    const avgRate = roundToPaisa(group.totalPayRate / group.count);
    const lineTotal = roundToPaisa(totalPresent * avgRate);

    let description = roleType;
    if (group.dayPresent > 0 && group.nightPresent > 0) {
      description += ` - [${group.dayPresent} Day, ${group.nightPresent} Night shifts]`;
    } else if (group.dayPresent > 0) {
      description += ` - [${group.dayPresent} Day shifts]`;
    } else {
      description += ` - [${group.nightPresent} Night shifts]`;
    }

    lineItems.push({
      id: `att-${roleType}`,
      role: roleType,
      shiftType: 'day',
      rateType: 'shift',
      quantity: totalPresent,
      manDays: 1,           // Each shift is 1 unit (already counted individually)
      ratePerSlot: avgRate,
      monthlyRate: undefined,
      lineTotal,
      description,
      daySlots: group.dayPresent,
      nightSlots: group.nightPresent,
    });
    subtotal += lineTotal;
  }

  // Utility charges
  if (includeUtilities) {
    try {
      const utilityCharges = await getUtilityChargesForSite(site.id);
      utilityCharges.forEach((utility) => {
        const lineTotal = roundToPaisa(Number((utility as any).amount) || 0);
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
          description: (utility as any).description,
        });
        subtotal += lineTotal;
      });
    } catch (error) {
      console.error('Error fetching utility charges:', error);
    }
  }

  subtotal = roundToPaisa(subtotal);
  const gstCalculation = calculateGST(subtotal, site.gstType);

  const billingCompanyName = site.gstType === 'PERSONAL' && site.personalBillingName
    ? site.personalBillingName
    : companySettings?.company_name || "Your Security Company";

  return {
    invoiceNumber: 'PREVIEW',
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
    totalAmount: gstCalculation.totalAmount,
    pendingSlots,
  };
}

// ─── Round Off (kept for backward compat but uses paisa precision) ──
export function calculateRoundOff(totalAmount: number): { roundOff: number; roundedTotal: number } {
  const roundedTotal = Math.round(totalAmount);
  const roundOff = roundToPaisa(roundedTotal - totalAmount);
  return { roundOff, roundedTotal };
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
