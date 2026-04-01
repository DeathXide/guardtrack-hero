import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Types
export type UniformItem = Database['public']['Tables']['uniform_items']['Row'];
export type CreateUniformItem = Omit<Database['public']['Tables']['uniform_items']['Insert'], 'id' | 'created_at' | 'updated_at'>;
export type UniformIssuance = Database['public']['Tables']['uniform_issuances']['Row'];
export type CreateUniformIssuance = Omit<Database['public']['Tables']['uniform_issuances']['Insert'], 'id' | 'created_at' | 'updated_at'>;

export type UniformIssuanceWithDetails = UniformIssuance & {
  guards: { name: string; badge_number: string } | null;
  uniform_items: { item_name: string } | null;
};

// Uniform Items (master data)
export const uniformItemsApi = {
  async getAllItems(): Promise<UniformItem[]> {
    const { data, error } = await supabase
      .from('uniform_items')
      .select('*')
      .order('item_name');

    if (error) throw error;
    return data;
  },

  async getActiveItems(): Promise<UniformItem[]> {
    const { data, error } = await supabase
      .from('uniform_items')
      .select('*')
      .eq('is_active', true)
      .order('item_name');

    if (error) throw error;
    return data;
  },

  async createItem(itemData: CreateUniformItem): Promise<UniformItem> {
    const { data, error } = await supabase
      .from('uniform_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateItem(id: string, itemData: Partial<UniformItem>): Promise<UniformItem> {
    const { data, error } = await supabase
      .from('uniform_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('uniform_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Uniform Issuances (guard-specific records)
export const uniformIssuancesApi = {
  async getAll(): Promise<UniformIssuanceWithDetails[]> {
    const { data, error } = await supabase
      .from('uniform_issuances')
      .select(`
        *,
        guards (name, badge_number),
        uniform_items (item_name)
      `)
      .order('issued_date', { ascending: false });

    if (error) throw error;
    return data as UniformIssuanceWithDetails[];
  },

  async getByGuardId(guardId: string): Promise<UniformIssuanceWithDetails[]> {
    const { data, error } = await supabase
      .from('uniform_issuances')
      .select(`
        *,
        guards (name, badge_number),
        uniform_items (item_name)
      `)
      .eq('guard_id', guardId)
      .order('issued_date', { ascending: false });

    if (error) throw error;
    return data as UniformIssuanceWithDetails[];
  },

  async createBatch(issuances: CreateUniformIssuance[]): Promise<UniformIssuance[]> {
    const { data, error } = await supabase
      .from('uniform_issuances')
      .insert(issuances)
      .select();

    if (error) throw error;

    // Update guard's uniform_issued flag
    const guardIds = [...new Set(issuances.map(i => i.guard_id))];
    for (const guardId of guardIds) {
      await supabase
        .from('guards')
        .update({
          uniform_issued: true,
          uniform_issued_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', guardId);
    }

    return data;
  },

  async updateCondition(id: string, condition: string, guardId: string): Promise<UniformIssuance> {
    const { data, error } = await supabase
      .from('uniform_issuances')
      .update({ condition })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If marking as returned/damaged, check if guard has any active issuances left
    if (condition === 'returned' || condition === 'damaged') {
      await syncGuardUniformStatus(guardId);
    }

    return data;
  },

  async delete(id: string, guardId: string): Promise<void> {
    const { error } = await supabase
      .from('uniform_issuances')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Check if guard still has active issuances
    await syncGuardUniformStatus(guardId);
  },

  async getSummary(): Promise<{
    totalIssued: number;
    totalCost: number;
    guardsWithUniform: number;
    guardsWithoutUniform: number;
  }> {
    // Get all active issuances (not returned/damaged)
    const { data: issuances, error: issuancesError } = await supabase
      .from('uniform_issuances')
      .select('guard_id, quantity, total_cost, condition');

    if (issuancesError) throw issuancesError;

    const activeIssuances = issuances.filter(i => i.condition !== 'returned');
    const totalIssued = activeIssuances.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const totalCost = issuances.reduce((sum, i) => sum + Number(i.total_cost || 0), 0);
    const guardsWithUniform = new Set(activeIssuances.map(i => i.guard_id)).size;

    // Get total active guards count
    const { count: totalGuards, error: guardsError } = await supabase
      .from('guards')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (guardsError) throw guardsError;

    return {
      totalIssued,
      totalCost,
      guardsWithUniform,
      guardsWithoutUniform: (totalGuards || 0) - guardsWithUniform,
    };
  },
};

// Helper: sync guard's uniform_issued flag based on active issuances
async function syncGuardUniformStatus(guardId: string) {
  const { data: remaining, error } = await supabase
    .from('uniform_issuances')
    .select('id, condition')
    .eq('guard_id', guardId);

  if (error) return;

  const hasActive = remaining.some(r => r.condition !== 'returned');

  await supabase
    .from('guards')
    .update({
      uniform_issued: hasActive,
      uniform_issued_date: hasActive ? undefined : null,
    })
    .eq('id', guardId);
}
