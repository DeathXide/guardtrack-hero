
import { supabase } from './client';
import { convertSiteFromDB, convertSiteToDB } from './converters';
import { Site, SiteDB, SiteEarnings } from '@/types';

export const fetchSites = async (): Promise<Site[]> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*');

  if (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }

  return (data as SiteDB[]).map(convertSiteFromDB);
};

export const fetchSite = async (id: string): Promise<Site | null> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching site with id ${id}:`, error);
    return null;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const createSite = async (site: Partial<Site>): Promise<Site> => {
  const { data, error } = await supabase
    .from('sites')
    .insert(convertSiteToDB(site))
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const updateSite = async (id: string, site: Partial<Site>): Promise<Site> => {
  const { data, error } = await supabase
    .from('sites')
    .update(convertSiteToDB(site))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating site with id ${id}:`, error);
    throw error;
  }

  return convertSiteFromDB(data as SiteDB);
};

export const deleteSite = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting site with id ${id}:`, error);
    throw error;
  }
};

export const fetchSiteMonthlyEarnings = async (siteId: string, month: string): Promise<SiteEarnings> => {
  const { data, error } = await supabase.rpc('calculate_site_monthly_earnings', {
    site_uuid: siteId,
    month_date: month
  });

  if (error) {
    console.error('Error fetching site monthly earnings:', error);
    throw error;
  }

  return data && data.length > 0 
    ? {
        totalShifts: data[0].total_shifts,
        allocatedAmount: Number(data[0].allocated_amount),
        guardCosts: Number(data[0].guard_costs),
        netEarnings: Number(data[0].net_earnings)
      }
    : {
        totalShifts: 0,
        allocatedAmount: 0,
        guardCosts: 0,
        netEarnings: 0
      };
};
