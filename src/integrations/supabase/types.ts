export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
      sites: {
        Row: {
          address: string
          created_at: string
          gst_number: string
          gst_type: string
          id: string
          organization_name: string
          site_category: string
          site_name: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          gst_number: string
          gst_type: string
          id?: string
          organization_name: string
          site_category: string
          site_name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          gst_number?: string
          gst_type?: string
          id?: string
          organization_name?: string
          site_category?: string
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staffing_requirements: {
        Row: {
          budget_per_slot: number
          created_at: string
          day_slots: number
          id: string
          night_slots: number
          role_type: string
          site_id: string
          updated_at: string
        }
        Insert: {
          budget_per_slot: number
          created_at?: string
          day_slots?: number
          id?: string
          night_slots?: number
          role_type: string
          site_id: string
          updated_at?: string
        }
        Update: {
          budget_per_slot?: number
          created_at?: string
          day_slots?: number
          id?: string
          night_slots?: number
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
