export interface SiteUtilityCharge {
  id: string;
  site_id: string;
  utility_type: 'water' | 'electricity' | 'maintenance' | 'other';
  utility_name: string;
  monthly_amount: number;
  billing_frequency: 'monthly' | 'quarterly' | 'annual';
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUtilityChargeData {
  site_id: string;
  utility_type: 'water' | 'electricity' | 'maintenance' | 'other';
  utility_name: string;
  monthly_amount: number;
  billing_frequency: 'monthly' | 'quarterly' | 'annual';
  description?: string;
  is_active?: boolean;
}