import { supabase } from '@/integrations/supabase/client';
import { SiteUtilityCharge, CreateUtilityChargeData } from '@/types/utility';

export async function getUtilityChargesForSite(siteId: string): Promise<SiteUtilityCharge[]> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .select('id, site_id, description, amount, is_active, created_at, updated_at')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching utility charges:', error);
    throw new Error('Failed to fetch utility charges');
  }

  return ((data || []) as any).map((u: any) => ({
    id: u.id,
    site_id: u.site_id,
    description: u.description ?? '',
    amount: Number(u.amount) || 0,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  })) as SiteUtilityCharge[];
}

export async function createUtilityCharge(utilityData: CreateUtilityChargeData): Promise<SiteUtilityCharge> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .insert([{
      site_id: utilityData.site_id,
      description: utilityData.description,
      amount: utilityData.amount,
      is_active: utilityData.is_active ?? true
    } as any])
    .select()
    .single();

  if (error) {
    console.error('Error creating utility charge:', error);
    throw new Error('Failed to create utility charge');
  }

  return (data as any) as SiteUtilityCharge;
}

export async function updateUtilityCharge(id: string, updates: Partial<CreateUtilityChargeData>): Promise<SiteUtilityCharge> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating utility charge:', error);
    throw new Error('Failed to update utility charge');
  }

  return (data as any) as SiteUtilityCharge;
}

export async function deleteUtilityCharge(id: string): Promise<void> {
  const { error } = await supabase
    .from('site_utility_charges')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting utility charge:', error);
    throw new Error('Failed to delete utility charge');
  }
}

export async function getAllUtilityCharges(): Promise<SiteUtilityCharge[]> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .select('id, site_id, description, amount, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all utility charges:', error);
    throw new Error('Failed to fetch utility charges');
  }

  return ((data || []) as any).map((u: any) => ({
    id: u.id,
    site_id: u.site_id,
    description: u.description ?? '',
    amount: Number(u.amount) || 0,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  })) as SiteUtilityCharge[];
}