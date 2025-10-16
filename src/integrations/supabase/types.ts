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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      benefits: {
        Row: {
          applicable_countries: string[] | null
          benefit_type: Database["public"]["Enums"]["benefit_type"]
          cost: number
          cost_type: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          applicable_countries?: string[] | null
          benefit_type?: Database["public"]["Enums"]["benefit_type"]
          cost: number
          cost_type?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          applicable_countries?: string[] | null
          benefit_type?: Database["public"]["Enums"]["benefit_type"]
          cost?: number
          cost_type?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          accent_color: string | null
          add_confidentiality_footer: boolean | null
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          include_generated_date: boolean | null
          include_logo: boolean | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          show_company_details: boolean | null
          show_page_numbers: boolean | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          add_confidentiality_footer?: boolean | null
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          include_generated_date?: boolean | null
          include_logo?: boolean | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_company_details?: boolean | null
          show_page_numbers?: boolean | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          add_confidentiality_footer?: boolean | null
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          include_generated_date?: boolean | null
          include_logo?: boolean | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_company_details?: boolean | null
          show_page_numbers?: boolean | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      employee_number_settings: {
        Row: {
          created_at: string
          default_prefix: string
          id: string
          include_country_code: boolean
          next_sequence: number
          number_format: string
          sequence_digits: number
          updated_at: string
          use_department_prefix: boolean
          use_employment_type: boolean
        }
        Insert: {
          created_at?: string
          default_prefix?: string
          id?: string
          include_country_code?: boolean
          next_sequence?: number
          number_format?: string
          sequence_digits?: number
          updated_at?: string
          use_department_prefix?: boolean
          use_employment_type?: boolean
        }
        Update: {
          created_at?: string
          default_prefix?: string
          id?: string
          include_country_code?: boolean
          next_sequence?: number
          number_format?: string
          sequence_digits?: number
          updated_at?: string
          use_department_prefix?: boolean
          use_employment_type?: boolean
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_number: string | null
          account_type: string | null
          bank_branch: string | null
          bank_name: string | null
          country: string
          created_at: string
          currency: string | null
          date_of_birth: string | null
          department: string | null
          email: string
          employee_number: string | null
          employee_type: string
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          national_id: string | null
          nssf_number: string | null
          passport_number: string | null
          pay_group_id: string | null
          pay_rate: number
          pay_type: Database["public"]["Enums"]["pay_type"]
          phone: string | null
          project: string | null
          status: string
          tin: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          country: string
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department?: string | null
          email: string
          employee_number?: string | null
          employee_type?: string
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          national_id?: string | null
          nssf_number?: string | null
          passport_number?: string | null
          pay_group_id?: string | null
          pay_rate: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          phone?: string | null
          project?: string | null
          status?: string
          tin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string
          employee_number?: string | null
          employee_type?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          national_id?: string | null
          nssf_number?: string | null
          passport_number?: string | null
          pay_group_id?: string | null
          pay_rate?: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          phone?: string | null
          project?: string | null
          status?: string
          tin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      expatriate_policies: {
        Row: {
          apply_flat_tax: boolean
          country: string
          created_at: string
          education_allowance_percent: number | null
          exempt_housing_levy: boolean
          exempt_lst: boolean
          exempt_nhif: boolean
          flat_tax_rate: number | null
          housing_allowance_percent: number | null
          id: string
          social_security_reduced_rate: number | null
          social_security_treatment: string
          travel_allowance_percent: number | null
          updated_at: string
        }
        Insert: {
          apply_flat_tax?: boolean
          country: string
          created_at?: string
          education_allowance_percent?: number | null
          exempt_housing_levy?: boolean
          exempt_lst?: boolean
          exempt_nhif?: boolean
          flat_tax_rate?: number | null
          housing_allowance_percent?: number | null
          id?: string
          social_security_reduced_rate?: number | null
          social_security_treatment?: string
          travel_allowance_percent?: number | null
          updated_at?: string
        }
        Update: {
          apply_flat_tax?: boolean
          country?: string
          created_at?: string
          education_allowance_percent?: number | null
          exempt_housing_levy?: boolean
          exempt_lst?: boolean
          exempt_nhif?: boolean
          flat_tax_rate?: number | null
          housing_allowance_percent?: number | null
          id?: string
          social_security_reduced_rate?: number | null
          social_security_treatment?: string
          travel_allowance_percent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pay_calculation_audit_log: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          pay_run_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          pay_run_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          pay_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_calculation_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_calculation_audit_log_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_groups: {
        Row: {
          country: string
          created_at: string
          default_tax_percentage: number
          description: string | null
          id: string
          name: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          default_tax_percentage?: number
          description?: string | null
          id?: string
          name: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          default_tax_percentage?: number
          description?: string | null
          id?: string
          name?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          updated_at?: string
        }
        Relationships: []
      }
      pay_item_custom_deductions: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          pay_item_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          name: string
          pay_item_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          pay_item_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_item_custom_deductions_pay_item_id_fkey"
            columns: ["pay_item_id"]
            isOneToOne: false
            referencedRelation: "pay_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_items: {
        Row: {
          benefit_deductions: number
          created_at: string
          employee_id: string
          employer_contributions: number
          gross_pay: number
          hours_worked: number | null
          id: string
          net_pay: number
          notes: string | null
          pay_run_id: string
          pieces_completed: number | null
          status: Database["public"]["Enums"]["pay_item_status"]
          tax_deduction: number
          total_deductions: number
          updated_at: string
        }
        Insert: {
          benefit_deductions?: number
          created_at?: string
          employee_id: string
          employer_contributions?: number
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          net_pay?: number
          notes?: string | null
          pay_run_id: string
          pieces_completed?: number | null
          status?: Database["public"]["Enums"]["pay_item_status"]
          tax_deduction?: number
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          benefit_deductions?: number
          created_at?: string
          employee_id?: string
          employer_contributions?: number
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          net_pay?: number
          notes?: string | null
          pay_run_id?: string
          pieces_completed?: number | null
          status?: Database["public"]["Enums"]["pay_item_status"]
          tax_deduction?: number
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          pay_group_id: string
          pay_period_end: string
          pay_period_start: string
          pay_run_date: string
          status: Database["public"]["Enums"]["pay_run_status"]
          total_deductions: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pay_group_id: string
          pay_period_end: string
          pay_period_start: string
          pay_run_date?: string
          status?: Database["public"]["Enums"]["pay_run_status"]
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pay_group_id?: string
          pay_period_end?: string
          pay_period_start?: string
          pay_run_date?: string
          status?: Database["public"]["Enums"]["pay_run_status"]
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_generations: {
        Row: {
          created_by: string | null
          employee_id: string | null
          export_format: string
          file_size: number | null
          generated_at: string
          id: string
          pay_run_id: string | null
          template_id: string | null
        }
        Insert: {
          created_by?: string | null
          employee_id?: string | null
          export_format?: string
          file_size?: number | null
          generated_at?: string
          id?: string
          pay_run_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_by?: string | null
          employee_id?: string | null
          export_format?: string
          file_size?: number | null
          generated_at?: string
          id?: string
          pay_run_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslip_generations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_generations_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payslip_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_templates: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "employee"
      benefit_type:
        | "health_insurance"
        | "retirement"
        | "dental"
        | "vision"
        | "other"
      pay_frequency: "weekly" | "bi_weekly" | "monthly" | "custom"
      pay_item_status: "draft" | "pending" | "approved" | "paid"
      pay_run_status: "draft" | "pending_approval" | "approved" | "processed"
      pay_type: "hourly" | "salary" | "piece_rate"
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
      app_role: ["super_admin", "admin", "manager", "employee"],
      benefit_type: [
        "health_insurance",
        "retirement",
        "dental",
        "vision",
        "other",
      ],
      pay_frequency: ["weekly", "bi_weekly", "monthly", "custom"],
      pay_item_status: ["draft", "pending", "approved", "paid"],
      pay_run_status: ["draft", "pending_approval", "approved", "processed"],
      pay_type: ["hourly", "salary", "piece_rate"],
    },
  },
} as const
