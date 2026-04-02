import { supabase } from '@/integrations/supabase/client';
import { guardsApi } from './guardsApi';

export interface Payslip {
  id: string;
  guard_id: string;
  guard_name: string;
  month: string;
  days_in_month: number;
  total_shifts: number;
  shifts_worked: number;
  base_salary: number;
  is_per_shift: boolean;
  shift_based_salary: number;
  override_pay: number;
  total_bonus: number;
  total_deduction: number;
  net_pay: number;
  status: 'draft' | 'approved' | 'paid';
  generated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayslipSummary {
  totalGuards: number;
  totalNetPay: number;
  totalBonuses: number;
  totalDeductions: number;
  draftCount: number;
  approvedCount: number;
  paidCount: number;
}

// ─── Precision helper ───────────────────────────────────────────
function roundToPaisa(value: number): number {
  return Math.round(value * 100) / 100;
}

export const payslipsApi = {

  // Generate payslip for a single guard for a month
  // Uses guardsApi.getGuardMonthlySummary for precision-safe calculation
  async generatePayslip(guardId: string, month: string): Promise<Payslip> {
    // Get guard info
    const { data: guard, error: guardError } = await supabase
      .from('guards')
      .select('name, monthly_pay_rate, per_shift_rate')
      .eq('id', guardId)
      .single();

    if (guardError || !guard) throw new Error('Guard not found');

    // Get precision-safe monthly summary from guardsApi
    const summary = await guardsApi.getGuardMonthlySummary(guardId, month);

    // Check for pending slots before generating
    const [yearStr, monthStr] = month.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

    const { data: pendingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('id')
      .eq('assigned_guard_id', guardId)
      .gte('attendance_date', `${month}-01`)
      .lte('attendance_date', `${month}-${daysInMonth}`)
      .not('assigned_guard_id', 'is', null)
      .is('is_present', null);

    const pendingCount = pendingSlots?.length || 0;

    // Upsert payslip (update if draft exists, error if approved/paid)
    const { data: existing } = await supabase
      .from('payslips')
      .select('id, status')
      .eq('guard_id', guardId)
      .eq('month', month)
      .single();

    if (existing && existing.status !== 'draft') {
      throw new Error(`Payslip for this month is already ${existing.status}. Cannot regenerate.`);
    }

    const payslipData = {
      guard_id: guardId,
      guard_name: guard.name,
      month,
      days_in_month: summary.daysInMonth,
      total_shifts: summary.totalShifts,
      shifts_worked: summary.shiftsWorked,
      base_salary: summary.baseSalary,
      is_per_shift: summary.isPerShiftGuard,
      shift_based_salary: summary.shiftBasedSalary,
      override_pay: 0, // Already included in shiftBasedSalary
      total_bonus: summary.totalBonus,
      total_deduction: summary.totalDeduction,
      net_pay: summary.netAmount,
      status: 'draft' as const,
      generated_at: new Date().toISOString(),
      notes: pendingCount > 0 ? `Warning: ${pendingCount} slot(s) still pending at generation time` : null,
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('payslips')
        .update(payslipData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('payslips')
        .insert(payslipData)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return result;
  },

  // Generate payslips for ALL active guards for a month
  async generateAllPayslips(month: string): Promise<{ generated: number; skipped: number; errors: string[] }> {
    const { data: guards, error } = await supabase
      .from('guards')
      .select('id, name')
      .eq('status', 'active');

    if (error) throw error;

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const guard of guards || []) {
      try {
        await this.generatePayslip(guard.id, month);
        generated++;
      } catch (err: any) {
        if (err.message?.includes('already')) {
          skipped++;
        } else {
          errors.push(`${guard.name}: ${err.message}`);
        }
      }
    }

    return { generated, skipped, errors };
  },

  // Get payslip by ID
  async getPayslip(id: string): Promise<Payslip> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get payslip for a guard + month
  async getPayslipByGuardMonth(guardId: string, month: string): Promise<Payslip | null> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('guard_id', guardId)
      .eq('month', month)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // List all payslips for a month
  async getPayslipsByMonth(month: string): Promise<Payslip[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('month', month)
      .order('guard_name');

    if (error) throw error;
    return data || [];
  },

  // Get summary stats for a month
  async getMonthSummary(month: string): Promise<PayslipSummary> {
    const payslips = await this.getPayslipsByMonth(month);

    return {
      totalGuards: payslips.length,
      totalNetPay: roundToPaisa(payslips.reduce((sum, p) => sum + Number(p.net_pay), 0)),
      totalBonuses: roundToPaisa(payslips.reduce((sum, p) => sum + Number(p.total_bonus), 0)),
      totalDeductions: roundToPaisa(payslips.reduce((sum, p) => sum + Number(p.total_deduction), 0)),
      draftCount: payslips.filter(p => p.status === 'draft').length,
      approvedCount: payslips.filter(p => p.status === 'approved').length,
      paidCount: payslips.filter(p => p.status === 'paid').length,
    };
  },

  // Approve a payslip (locks it from regeneration)
  async approvePayslip(id: string): Promise<Payslip> {
    const { data, error } = await supabase
      .from('payslips')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft') // Can only approve drafts
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Payslip is not in draft status');
      throw error;
    }
    return data;
  },

  // Mark payslip as paid
  async markPaid(id: string): Promise<Payslip> {
    const { data, error } = await supabase
      .from('payslips')
      .update({ status: 'paid' })
      .eq('id', id)
      .eq('status', 'approved') // Can only mark approved as paid
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Payslip must be approved before marking as paid');
      throw error;
    }
    return data;
  },

  // Bulk approve all draft payslips for a month
  async bulkApprove(month: string): Promise<number> {
    const { data, error } = await supabase
      .from('payslips')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('month', month)
      .eq('status', 'draft')
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  },

  // Bulk mark paid for a month
  async bulkMarkPaid(month: string): Promise<number> {
    const { data, error } = await supabase
      .from('payslips')
      .update({ status: 'paid' })
      .eq('month', month)
      .eq('status', 'approved')
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  },

  // Check for pending attendance slots before month-end processing
  async getPendingSlotsForMonth(month: string): Promise<{ guardId: string; guardName: string; pendingCount: number }[]> {
    const [yearStr, monthStr] = month.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        assigned_guard_id,
        guards:assigned_guard_id ( name )
      `)
      .gte('attendance_date', `${month}-01`)
      .lte('attendance_date', `${month}-${daysInMonth}`)
      .not('assigned_guard_id', 'is', null)
      .is('is_present', null);

    if (error) throw error;

    // Group by guard
    const guardMap = new Map<string, { name: string; count: number }>();
    for (const slot of data || []) {
      const guardId = slot.assigned_guard_id!;
      const guardName = (slot.guards as any)?.name || 'Unknown';
      if (!guardMap.has(guardId)) {
        guardMap.set(guardId, { name: guardName, count: 0 });
      }
      guardMap.get(guardId)!.count++;
    }

    return Array.from(guardMap.entries()).map(([guardId, info]) => ({
      guardId,
      guardName: info.name,
      pendingCount: info.count,
    }));
  },
};
