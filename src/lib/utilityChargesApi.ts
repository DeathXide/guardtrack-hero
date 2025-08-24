import { supabase } from '@/integrations/supabase/client';
import { SiteUtilityCharge, CreateUtilityChargeData } from '@/types/utility';

export async function getUtilityChargesForSite(siteId: string): Promise<SiteUtilityCharge[]> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('utility_type', { ascending: true });

  if (error) {
    console.error('Error fetching utility charges:', error);
    throw new Error('Failed to fetch utility charges');
  }

  return (data || []) as SiteUtilityCharge[];
}

export async function createUtilityCharge(utilityData: CreateUtilityChargeData): Promise<SiteUtilityCharge> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .insert([{
      ...utilityData,
      is_active: utilityData.is_active ?? true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating utility charge:', error);
    throw new Error('Failed to create utility charge');
  }

  return data as SiteUtilityCharge;
}

export async function updateUtilityCharge(id: string, updates: Partial<CreateUtilityChargeData>): Promise<SiteUtilityCharge> {
  const { data, error } = await supabase
    .from('site_utility_charges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating utility charge:', error);
    throw new Error('Failed to update utility charge');
  }

  return data as SiteUtilityCharge;
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
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all utility charges:', error);
    throw new Error('Failed to fetch utility charges');
  }

  return (data || []) as SiteUtilityCharge[];
}