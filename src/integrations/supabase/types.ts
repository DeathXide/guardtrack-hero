export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          approved_at: string | null
          approved_by: string | null
          attendance_date: string
          break_duration: number | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          correction_reason: string | null
          created_at: string
          employee_id: string
          employee_type: string
          id: string
          is_correction: boolean | null
          notes: string | null
          original_record_id: string | null
          overtime_hours: number | null
          scheduled_end_time: string
          scheduled_start_time: string
          shift_type: string
          site_id: string
          slot_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          break_duration?: number | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          correction_reason?: string | null
          created_at?: string
          employee_id: string
          employee_type?: string
          id?: string
          is_correction?: boolean | null
          notes?: string | null
          original_record_id?: string | null
          overtime_hours?: number | null
          scheduled_end_time: string
          scheduled_start_time: string
          shift_type: string
          site_id: string
          slot_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          break_duration?: number | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          correction_reason?: string | null
          created_at?: string
          employee_id?: string
          employee_type?: string
          id?: string
          is_correction?: boolean | null
          notes?: string | null
          original_record_id?: string | null
          overtime_hours?: number | null
          scheduled_end_time?: string
          scheduled_start_time?: string
          shift_type?: string
          site_id?: string
          slot_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_original_record_id_fkey"
            columns: ["original_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "daily_attendance_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_records_guard_id"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          allowed_break_duration: number | null
          created_at: string
          day_shift_end: string | null
          day_shift_start: string | null
          early_departure_grace_period: number | null
          id: string
          late_grace_period: number | null
          location_radius: number | null
          night_shift_end: string | null
          night_shift_start: string | null
          require_check_in_photo: boolean | null
          require_check_out_photo: boolean | null
          site_id: string
          site_latitude: number | null
          site_longitude: number | null
          updated_at: string
        }
        Insert: {
          allowed_break_duration?: number | null
          created_at?: string
          day_shift_end?: string | null
          day_shift_start?: string | null
          early_departure_grace_period?: number | null
          id?: string
          late_grace_period?: number | null
          location_radius?: number | null
          night_shift_end?: string | null
          night_shift_start?: string | null
          require_check_in_photo?: boolean | null
          require_check_out_photo?: boolean | null
          site_id: string
          site_latitude?: number | null
          site_longitude?: number | null
          updated_at?: string
        }
        Update: {
          allowed_break_duration?: number | null
          created_at?: string
          day_shift_end?: string | null
          day_shift_start?: string | null
          early_departure_grace_period?: number | null
          id?: string
          late_grace_period?: number | null
          location_radius?: number | null
          night_shift_end?: string | null
          night_shift_start?: string | null
          require_check_in_photo?: boolean | null
          require_check_out_photo?: boolean | null
          site_id?: string
          site_latitude?: number | null
          site_longitude?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_address_line1: string | null
          company_address_line2: string | null
          company_address_line3: string | null
          company_email: string | null
          company_logo_url: string | null
          company_motto: string | null
          company_name: string
          company_phone: string | null
          company_seal_image_url: string | null
          company_website: string | null
          created_at: string
          gst_number: string | null
          id: string
          pan_number: string | null
          personal_billing_names: Json | null
          updated_at: string
        }
        Insert: {
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_address_line3?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_motto?: string | null
          company_name?: string
          company_phone?: string | null
          company_seal_image_url?: string | null
          company_website?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          pan_number?: string | null
          personal_billing_names?: Json | null
          updated_at?: string
        }
        Update: {
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_address_line3?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_motto?: string | null
          company_name?: string
          company_phone?: string | null
          company_seal_image_url?: string | null
          company_website?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          pan_number?: string | null
          personal_billing_names?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_attendance_slots: {
        Row: {
          assigned_guard_id: string | null
          attendance_date: string
          created_at: string
          id: string
          is_present: boolean | null
          is_temporary: boolean
          pay_rate: number | null
          role_type: string
          shift_type: string
          site_id: string
          slot_number: number
          updated_at: string
        }
        Insert: {
          assigned_guard_id?: string | null
          attendance_date: string
          created_at?: string
          id?: string
          is_present?: boolean | null
          is_temporary?: boolean
          pay_rate?: number | null
          role_type: string
          shift_type: string
          site_id: string
          slot_number: number
          updated_at?: string
        }
        Update: {
          assigned_guard_id?: string | null
          attendance_date?: string
          created_at?: string
          id?: string
          is_present?: boolean | null
          is_temporary?: boolean
          pay_rate?: number | null
          role_type?: string
          shift_type?: string
          site_id?: string
          slot_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_slots_assigned_guard_id_fkey"
            columns: ["assigned_guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_slots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      guards: {
        Row: {
          aadhaar_card_photo_url: string | null
          aadhaar_number: string | null
          account_number: string
          alternate_phone_number: string | null
          badge_number: string
          bank_name: string
          created_at: string
          current_address: string
          dob: string
          gender: Database["public"]["Enums"]["gender_type"]
          guard_photo_url: string | null
          guard_type: Database["public"]["Enums"]["guard_type"]
          id: string
          ifsc_code: string | null
          languages: string[]
          monthly_pay_rate: number
          name: string
          pan_card_number: string | null
          permanent_address: string | null
          phone_number: string
          status: Database["public"]["Enums"]["guard_status"]
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          aadhaar_card_photo_url?: string | null
          aadhaar_number?: string | null
          account_number: string
          alternate_phone_number?: string | null
          badge_number: string
          bank_name: string
          created_at?: string
          current_address: string
          dob: string
          gender: Database["public"]["Enums"]["gender_type"]
          guard_photo_url?: string | null
          guard_type: Database["public"]["Enums"]["guard_type"]
          id?: string
          ifsc_code?: string | null
          languages?: string[]
          monthly_pay_rate: number
          name: string
          pan_card_number?: string | null
          permanent_address?: string | null
          phone_number: string
          status?: Database["public"]["Enums"]["guard_status"]
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          aadhaar_card_photo_url?: string | null
          aadhaar_number?: string | null
          account_number?: string
          alternate_phone_number?: string | null
          badge_number?: string
          bank_name?: string
          created_at?: string
          current_address?: string
          dob?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          guard_photo_url?: string | null
          guard_type?: Database["public"]["Enums"]["guard_type"]
          id?: string
          ifsc_code?: string | null
          languages?: string[]
          monthly_pay_rate?: number
          name?: string
          pan_card_number?: string | null
          permanent_address?: string | null
          phone_number?: string
          status?: Database["public"]["Enums"]["guard_status"]
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      invoice_sequences: {
        Row: {
          created_at: string
          financial_year: string
          id: string
          next_number: number
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_year: string
          id?: string
          next_number?: number
          prefix?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_year?: string
          id?: string
          next_number?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cgst_amount: number
          cgst_rate: number
          client_address: string
          client_name: string
          company_gst: string | null
          company_name: string
          created_at: string
          gst_amount: number
          gst_rate: number
          gst_type: string
          id: string
          igst_amount: number
          igst_rate: number
          invoice_date: string
          invoice_number: string
          line_items: Json
          notes: string | null
          period_from: string
          period_to: string
          sgst_amount: number
          sgst_rate: number
          site_gst: string | null
          site_id: string
          site_name: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          cgst_amount?: number
          cgst_rate?: number
          client_address: string
          client_name: string
          company_gst?: string | null
          company_name: string
          created_at?: string
          gst_amount?: number
          gst_rate?: number
          gst_type: string
          id?: string
          igst_amount?: number
          igst_rate?: number
          invoice_date: string
          invoice_number: string
          line_items?: Json
          notes?: string | null
          period_from: string
          period_to: string
          sgst_amount?: number
          sgst_rate?: number
          site_gst?: string | null
          site_id: string
          site_name: string
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          cgst_amount?: number
          cgst_rate?: number
          client_address?: string
          client_name?: string
          company_gst?: string | null
          company_name?: string
          created_at?: string
          gst_amount?: number
          gst_rate?: number
          gst_type?: string
          id?: string
          igst_amount?: number
          igst_rate?: number
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          notes?: string | null
          period_from?: string
          period_to?: string
          sgst_amount?: number
          sgst_rate?: number
          site_gst?: string | null
          site_id?: string
          site_name?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_count: number
          employee_id: string
          employee_type: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count: number
          employee_id: string
          employee_type?: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number
          employee_id?: string
          employee_type?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          guard_id: string
          id: string
          note: string | null
          payment_date: string
          payment_month: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          guard_id: string
          id?: string
          note?: string | null
          payment_date?: string
          payment_month: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          guard_id?: string
          id?: string
          note?: string | null
          payment_date?: string
          payment_month?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          created_for_date: string | null
          guard_id: string | null
          id: string
          is_temporary: boolean | null
          role_type: string | null
          site_id: string
          temporary_pay_rate: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_for_date?: string | null
          guard_id?: string | null
          id?: string
          is_temporary?: boolean | null
          role_type?: string | null
          site_id: string
          temporary_pay_rate?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_for_date?: string | null
          guard_id?: string | null
          id?: string
          is_temporary?: boolean | null
          role_type?: string | null
          site_id?: string
          temporary_pay_rate?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_utility_charges: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          site_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          site_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          site_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          address: string
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          created_at: string
          gst_number: string
          gst_type: string
          id: string
          organization_name: string
          personal_billing_name: string | null
          site_category: string
          site_name: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          created_at?: string
          gst_number: string
          gst_type: string
          id?: string
          organization_name: string
          personal_billing_name?: string | null
          site_category: string
          site_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          created_at?: string
          gst_number?: string
          gst_type?: string
          id?: string
          organization_name?: string
          personal_billing_name?: string | null
          site_category?: string
          site_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      staffing_requirements: {
        Row: {
          budget_per_slot: number
          created_at: string
          day_slots: number
          description: string | null
          id: string
          night_slots: number
          rate_type: string
          role_type: string
          site_id: string
          updated_at: string
        }
        Insert: {
          budget_per_slot: number
          created_at?: string
          day_slots?: number
          description?: string | null
          id?: string
          night_slots?: number
          rate_type?: string
          role_type: string
          site_id: string
          updated_at?: string
        }
        Update: {
          budget_per_slot?: number
          created_at?: string
          day_slots?: number
          description?: string | null
          id?: string
          night_slots?: number
          rate_type?: string
          role_type?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staffing_requirements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_badge_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_financial_year: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      gender_type: "male" | "female" | "other"
      guard_status: "active" | "inactive"
      guard_type: "permanent" | "contract"
      payment_type: "bonus" | "deduction"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gender_type: ["male", "female", "other"],
      guard_status: ["active", "inactive"],
      guard_type: ["permanent", "contract"],
      payment_type: ["bonus", "deduction"],
    },
  },
} as const
