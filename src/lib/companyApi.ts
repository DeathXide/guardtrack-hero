import { supabase } from "@/integrations/supabase/client";

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
  company_seal_image_url?: string;
  personal_billing_names?: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdateCompanySettingsData {
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
  company_seal_image_url?: string;
  personal_billing_names?: string[];
}

export const companyApi = {
  // Get company settings (there should only be one record)
  getCompanySettings: async (): Promise<CompanySettings> => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`);
    }

    // Convert personal_billing_names from JSON to string array
    const processedData = {
      ...data,
      personal_billing_names: Array.isArray(data.personal_billing_names) 
        ? data.personal_billing_names 
        : (data.personal_billing_names ? [] : [])
    };

    return processedData as CompanySettings;
  },

  // Update company settings
  updateCompanySettings: async (settings: UpdateCompanySettingsData): Promise<CompanySettings> => {
    // Get the existing record ID
    const { data: existing, error: fetchError } = await supabase
      .from('company_settings')
      .select('id')
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch existing settings: ${fetchError.message}`);
    }

    const { data, error } = await supabase
      .from('company_settings')
      .update(settings)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update company settings: ${error.message}`);
    }

    // Convert personal_billing_names from JSON to string array
    const processedData = {
      ...data,
      personal_billing_names: Array.isArray(data.personal_billing_names) 
        ? data.personal_billing_names 
        : (data.personal_billing_names ? [] : [])
    };

    return processedData as CompanySettings;
  },
};