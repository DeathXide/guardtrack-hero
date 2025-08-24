import { supabase } from "@/integrations/supabase/client";

export interface SiteDB {
  id: string;
  site_name: string;
  organization_name: string;
  gst_number: string;
  gst_type: string; // This will be 'GST' | 'NGST' | 'RCM' | 'PERSONAL' but comes as string from DB
  address: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  site_category: string;
  personal_billing_name?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffingRequirementDB {
  id: string;
  site_id: string;
  role_type: string;
  budget_per_slot: number;
  day_slots: number;
  night_slots: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSiteData {
  site_name: string;
  organization_name: string;
  gst_number: string;
  gst_type: 'GST' | 'NGST' | 'RCM' | 'PERSONAL';
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  site_category: string;
  personal_billing_name?: string;
  staffing_requirements: {
    role_type: string;
    budget_per_slot: number;
    day_slots: number;
    night_slots: number;
  }[];
}

export interface UpdateSiteData extends CreateSiteData {
  id: string;
}

export const sitesApi = {
  // Get all sites with their staffing requirements
  async getAllSites() {
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (sitesError) throw sitesError;

    // Get staffing requirements for all sites
    const { data: staffingReqs, error: staffingError } = await supabase
      .from('staffing_requirements')
      .select('*');

    if (staffingError) throw staffingError;

    // Group staffing requirements by site_id
    const staffingBysite = staffingReqs.reduce((acc, req) => {
      if (!acc[req.site_id]) {
        acc[req.site_id] = [];
      }
      acc[req.site_id].push(req);
      return acc;
    }, {} as { [key: string]: StaffingRequirementDB[] });

    // Combine sites with their staffing requirements
    return sites.map(site => ({
      ...site,
      staffing_requirements: staffingBysite[site.id] || []
    }));
  },

  // Get a single site by ID with its staffing requirements
  async getSiteById(id: string) {
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single();

    if (siteError) throw siteError;

    const { data: staffingReqs, error: staffingError } = await supabase
      .from('staffing_requirements')
      .select('*')
      .eq('site_id', id);

    if (staffingError) throw staffingError;

    return {
      ...site,
      staffing_requirements: staffingReqs
    };
  },

  // Create a new site with staffing requirements
  async createSite(siteData: CreateSiteData) {
    // Combine address lines for backward compatibility
    const fullAddress = [siteData.address_line1, siteData.address_line2, siteData.address_line3]
      .filter(Boolean)
      .join(', ');

    // First, create the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        site_name: siteData.site_name,
        organization_name: siteData.organization_name,
        gst_number: siteData.gst_number,
        gst_type: siteData.gst_type,
        address: fullAddress,
        address_line1: siteData.address_line1,
        address_line2: siteData.address_line2,
        address_line3: siteData.address_line3,
        site_category: siteData.site_category,
        personal_billing_name: siteData.personal_billing_name
      })
      .select()
      .single();

    if (siteError) throw siteError;

    // Then, create the staffing requirements
    if (siteData.staffing_requirements.length > 0) {
      const staffingData = siteData.staffing_requirements.map(req => ({
        site_id: site.id,
        role_type: req.role_type,
        budget_per_slot: req.budget_per_slot,
        day_slots: req.day_slots,
        night_slots: req.night_slots
      }));

      const { error: staffingError } = await supabase
        .from('staffing_requirements')
        .insert(staffingData);

      if (staffingError) throw staffingError;
    }

    return site;
  },

  // Update a site and its staffing requirements
  async updateSite(siteData: UpdateSiteData) {
    // Combine address lines for backward compatibility
    const fullAddress = [siteData.address_line1, siteData.address_line2, siteData.address_line3]
      .filter(Boolean)
      .join(', ');

    // Update the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .update({
        site_name: siteData.site_name,
        organization_name: siteData.organization_name,
        gst_number: siteData.gst_number,
        gst_type: siteData.gst_type,
        address: fullAddress,
        address_line1: siteData.address_line1,
        address_line2: siteData.address_line2,
        address_line3: siteData.address_line3,
        site_category: siteData.site_category,
        personal_billing_name: siteData.personal_billing_name
      })
      .eq('id', siteData.id)
      .select()
      .single();

    if (siteError) throw siteError;

    // Delete existing staffing requirements
    const { error: deleteError } = await supabase
      .from('staffing_requirements')
      .delete()
      .eq('site_id', siteData.id);

    if (deleteError) throw deleteError;

    // Insert new staffing requirements
    if (siteData.staffing_requirements.length > 0) {
      const staffingData = siteData.staffing_requirements.map(req => ({
        site_id: siteData.id,
        role_type: req.role_type,
        budget_per_slot: req.budget_per_slot,
        day_slots: req.day_slots,
        night_slots: req.night_slots
      }));

      const { error: staffingError } = await supabase
        .from('staffing_requirements')
        .insert(staffingData);

      if (staffingError) throw staffingError;
    }

    return site;
  },

  // Delete a site (staffing requirements will be deleted automatically due to CASCADE)
  async deleteSite(id: string) {
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  },

  // Get staffing requirements for a specific site
  async getStaffingRequirements(siteId: string) {
    const { data, error } = await supabase
      .from('staffing_requirements')
      .select('*')
      .eq('site_id', siteId);

    if (error) throw error;

    return data;
  }
};