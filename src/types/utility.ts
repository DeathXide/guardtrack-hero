export interface SiteUtilityCharge {
  id: string;
  site_id: string;
  description: string;
  amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUtilityChargeData {
  site_id: string;
  description: string;
  amount: number;
  is_active?: boolean;
}