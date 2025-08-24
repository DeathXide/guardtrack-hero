import { supabase } from '@/integrations/supabase/client';
import { Site, StaffingSlot } from '@/types';

export interface SiteWithStaffing {
  id: string;
  site_name: string;
  organization_name: string;
  gst_number: string;
  gst_type: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  site_category: string;
  personal_billing_name?: string;
  status?: 'active' | 'inactive' | 'custom';
  staffing_requirements: Array<{
    id: string;
    role_type: string;
    day_slots: number;
    night_slots: number;
    budget_per_slot: number;
    rate_type: string;
    description?: string;
  }>;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  company_motto?: string;
  company_logo_url?: string;
  company_address_line1?: string;
  company_address_line2?: string;
  company_address_line3?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  gst_number?: string;
  pan_number?: string;
}

export async function fetchSitesWithStaffing(): Promise<SiteWithStaffing[]> {
  const { data: sites, error } = await supabase
    .from('sites')
    .select(`
      id,
      site_name,
      organization_name,
      gst_number,
      gst_type,
      address_line1,
      address_line2,
      address_line3,
      site_category,
      personal_billing_name,
      status,
      staffing_requirements (
        id,
        role_type,
        day_slots,
        night_slots,
        budget_per_slot,
        rate_type,
        description
      )
    `);

  if (error) {
    console.error('Error fetching sites with staffing:', error);
    throw error;
  }

  return (sites || []) as SiteWithStaffing[];
}

export async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching company settings:', error);
    throw error;
  }

  return data;
}

// Convert Supabase site data to our Site type for invoice generation
export function convertSiteToInvoiceFormat(site: SiteWithStaffing): Site {
  const staffingSlots: StaffingSlot[] = site.staffing_requirements.map(req => ({
    id: req.id,
    role: req.role_type as 'Security Guard' | 'Supervisor' | 'Housekeeping',
    daySlots: req.day_slots,
    nightSlots: req.night_slots,
    budgetPerSlot: Number(req.budget_per_slot),
    rateType: (req.rate_type || 'monthly') as 'monthly' | 'shift',
    description: req.description
  }));

  return {
    id: site.id,
    name: site.site_name,
    organizationName: site.organization_name,
    gstNumber: site.gst_number,
    addressLine1: site.address_line1 || '',
    addressLine2: site.address_line2 || '',
    addressLine3: site.address_line3 || '',
    gstType: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
    siteType: site.site_category,
    staffingSlots,
    personalBillingName: site.personal_billing_name,
    status: site.status || 'active',
    created_at: new Date().toISOString()
  };
}