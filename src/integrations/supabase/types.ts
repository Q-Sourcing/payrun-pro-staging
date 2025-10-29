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
      alert_logs: {
        Row: {
          created_at: string | null
          id: string
          integration_name: string
          message: string
          rule_id: string | null
          rule_name: string
          status: string
          triggered_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          integration_name: string
          message: string
          rule_id?: string | null
          rule_name: string
          status: string
          triggered_at: string
        }
        Update: {
          created_at?: string | null
          id?: string
          integration_name?: string
          message?: string
          rule_id?: string | null
          rule_name?: string
          status?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          condition: string
          created_at: string | null
          enabled: boolean | null
          escalation_level: number | null
          id: string
          integration_name: string
          name: string
          notification_channels: string[] | null
          threshold: number
          updated_at: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          enabled?: boolean | null
          escalation_level?: number | null
          id?: string
          integration_name: string
          name: string
          notification_channels?: string[] | null
          threshold: number
          updated_at?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          enabled?: boolean | null
          escalation_level?: number | null
          id?: string
          integration_name?: string
          name?: string
          notification_channels?: string[] | null
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          id: string
          leave_type: string | null
          overtime_hours: number | null
          remarks: string | null
          status: string
          synced_at: string | null
          synced_from_zoho: boolean | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          id?: string
          leave_type?: string | null
          overtime_hours?: number | null
          remarks?: string | null
          status: string
          synced_at?: string | null
          synced_from_zoho?: boolean | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          id?: string
          leave_type?: string | null
          overtime_hours?: number | null
          remarks?: string | null
          status?: string
          synced_at?: string | null
          synced_from_zoho?: boolean | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          integration_name: string
          ip_address: unknown
          resource: string
          result: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          integration_name: string
          ip_address?: unknown
          resource: string
          result?: string | null
          timestamp: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          integration_name?: string
          ip_address?: unknown
          resource?: string
          result?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      database_health_log: {
        Row: {
          check_date: string | null
          critical_issues_count: number | null
          health_score: number | null
          health_status: string | null
          id: string
          passed_checks: number | null
          report_data: Json | null
          total_checks: number | null
        }
        Insert: {
          check_date?: string | null
          critical_issues_count?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          passed_checks?: number | null
          report_data?: Json | null
          total_checks?: number | null
        }
        Update: {
          check_date?: string | null
          critical_issues_count?: number | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          passed_checks?: number | null
          report_data?: Json | null
          total_checks?: number | null
        }
        Relationships: []
      }
      employee_number_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          employee_id: string
          id: string
          new_employee_number: string
          old_employee_number: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          employee_id: string
          id?: string
          new_employee_number: string
          old_employee_number?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          employee_id?: string
          id?: string
          new_employee_number?: string
          old_employee_number?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_number_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_number_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_number_settings: {
        Row: {
          country_rules: Json
          created_at: string
          custom_format: string | null
          custom_prefix_per_pay_group: boolean
          default_prefix: string
          department_rules: Json
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
          country_rules?: Json
          created_at?: string
          custom_format?: string | null
          custom_prefix_per_pay_group?: boolean
          default_prefix?: string
          department_rules?: Json
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
          country_rules?: Json
          created_at?: string
          custom_format?: string | null
          custom_prefix_per_pay_group?: boolean
          default_prefix?: string
          department_rules?: Json
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
          employee_category: string | null
          employee_number: string
          employee_type: string
          employment_status: string | null
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
          social_security_number: string | null
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
          employee_category?: string | null
          employee_number: string
          employee_type?: string
          employment_status?: string | null
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
          social_security_number?: string | null
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
          employee_category?: string | null
          employee_number?: string
          employee_type?: string
          employment_status?: string | null
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
          social_security_number?: string | null
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
      expatriate_pay_groups: {
        Row: {
          country: string
          created_at: string | null
          currency: string | null
          exchange_rate_to_local: number
          id: string
          name: string
          notes: string | null
          paygroup_id: string | null
          tax_country: string
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          currency?: string | null
          exchange_rate_to_local?: number
          id?: string
          name: string
          notes?: string | null
          paygroup_id?: string | null
          tax_country: string
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          currency?: string | null
          exchange_rate_to_local?: number
          id?: string
          name?: string
          notes?: string | null
          paygroup_id?: string | null
          tax_country?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expatriate_pay_run_items: {
        Row: {
          allowances_foreign: number | null
          base_currency: string | null
          created_at: string | null
          currency: string
          daily_rate: number
          days_worked: number
          employee_id: string | null
          exchange_rate: number | null
          exchange_rate_to_local: number
          expatriate_pay_group_id: string | null
          gross_local: number
          id: string
          local_gross_pay: number | null
          local_net_pay: number | null
          net_foreign: number
          net_local: number
          pay_run_id: string | null
          tax_country: string
          updated_at: string | null
        }
        Insert: {
          allowances_foreign?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency: string
          daily_rate: number
          days_worked?: number
          employee_id?: string | null
          exchange_rate?: number | null
          exchange_rate_to_local: number
          expatriate_pay_group_id?: string | null
          gross_local: number
          id?: string
          local_gross_pay?: number | null
          local_net_pay?: number | null
          net_foreign: number
          net_local: number
          pay_run_id?: string | null
          tax_country: string
          updated_at?: string | null
        }
        Update: {
          allowances_foreign?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency?: string
          daily_rate?: number
          days_worked?: number
          employee_id?: string | null
          exchange_rate?: number | null
          exchange_rate_to_local?: number
          expatriate_pay_group_id?: string | null
          gross_local?: number
          id?: string
          local_gross_pay?: number | null
          local_net_pay?: number | null
          net_foreign?: number
          net_local?: number
          pay_run_id?: string | null
          tax_country?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expatriate_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_expatriate_pay_group_id_fkey"
            columns: ["expatriate_pay_group_id"]
            isOneToOne: false
            referencedRelation: "expatriate_pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
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
      integration_health: {
        Row: {
          api_response_time: number | null
          checked_at: string
          created_at: string | null
          error_rate: number | null
          failed_syncs: number | null
          id: string
          integration_name: string
          last_sync: string | null
          status: string
          successful_syncs: number | null
          total_syncs: number | null
          uptime: number | null
        }
        Insert: {
          api_response_time?: number | null
          checked_at: string
          created_at?: string | null
          error_rate?: number | null
          failed_syncs?: number | null
          id?: string
          integration_name: string
          last_sync?: string | null
          status: string
          successful_syncs?: number | null
          total_syncs?: number | null
          uptime?: number | null
        }
        Update: {
          api_response_time?: number | null
          checked_at?: string
          created_at?: string | null
          error_rate?: number | null
          failed_syncs?: number | null
          id?: string
          integration_name?: string
          last_sync?: string | null
          status?: string
          successful_syncs?: number | null
          total_syncs?: number | null
          uptime?: number | null
        }
        Relationships: []
      }
      integration_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          integration_name: string
          refresh_token: string
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          integration_name: string
          refresh_token: string
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          integration_name?: string
          refresh_token?: string
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lst_employee_assignments: {
        Row: {
          annual_amount: number
          created_at: string
          custom_amounts: Json | null
          distribution: string
          employee_id: string
          id: string
          months: number
          percentages: Json | null
          plan_id: string
          start_month: string
        }
        Insert: {
          annual_amount: number
          created_at?: string
          custom_amounts?: Json | null
          distribution: string
          employee_id: string
          id?: string
          months: number
          percentages?: Json | null
          plan_id: string
          start_month: string
        }
        Update: {
          annual_amount?: number
          created_at?: string
          custom_amounts?: Json | null
          distribution?: string
          employee_id?: string
          id?: string
          months?: number
          percentages?: Json | null
          plan_id?: string
          start_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "lst_employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lst_employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "lst_employee_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lst_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lst_payment_plans: {
        Row: {
          annual_amount: number
          apply_future: boolean
          country: string
          created_at: string
          custom_amounts: Json | null
          distribution: string
          id: string
          method: string
          months: number
          percentages: Json | null
          start_month: string
          updated_at: string
        }
        Insert: {
          annual_amount?: number
          apply_future?: boolean
          country?: string
          created_at?: string
          custom_amounts?: Json | null
          distribution?: string
          id?: string
          method?: string
          months?: number
          percentages?: Json | null
          start_month: string
          updated_at?: string
        }
        Update: {
          annual_amount?: number
          apply_future?: boolean
          country?: string
          created_at?: string
          custom_amounts?: Json | null
          distribution?: string
          id?: string
          method?: string
          months?: number
          percentages?: Json | null
          start_month?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          configuration: Json
          created_at: string | null
          enabled: boolean | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pay_calculation_audit_log: {
        Row: {
          calculated_at: string | null
          calculation_type: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          input_data: Json
          output_data: Json
          pay_run_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          calculation_type?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          input_data: Json
          output_data: Json
          pay_run_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          calculation_type?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          input_data?: Json
          output_data?: Json
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
            foreignKeyName: "pay_calculation_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
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
      pay_group_master: {
        Row: {
          active: boolean
          code: string | null
          country: string | null
          created_at: string
          currency: string | null
          id: string
          name: string
          source_id: string
          source_table: string
          type: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name: string
          source_id: string
          source_table: string
          type: string
        }
        Update: {
          active?: boolean
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          source_id?: string
          source_table?: string
          type?: string
        }
        Relationships: []
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
          type: Database["public"]["Enums"]["pay_group_type"]
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
          type?: Database["public"]["Enums"]["pay_group_type"]
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
          type?: Database["public"]["Enums"]["pay_group_type"]
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
            foreignKeyName: "pay_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
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
          days_worked: number | null
          exchange_rate: number | null
          id: string
          pay_group_id: string | null
          pay_group_master_id: string | null
          pay_period_end: string
          pay_period_start: string
          pay_run_date: string
          pay_run_id: string | null
          payroll_type: string | null
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
          days_worked?: number | null
          exchange_rate?: number | null
          id?: string
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          pay_period_end: string
          pay_period_start: string
          pay_run_date?: string
          pay_run_id?: string | null
          payroll_type?: string | null
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
          days_worked?: number | null
          exchange_rate?: number | null
          id?: string
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          pay_period_end?: string
          pay_period_start?: string
          pay_run_date?: string
          pay_run_id?: string | null
          payroll_type?: string | null
          status?: Database["public"]["Enums"]["pay_run_status"]
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_pay_group_master_id_fkey"
            columns: ["pay_group_master_id"]
            isOneToOne: false
            referencedRelation: "pay_group_master"
            referencedColumns: ["id"]
          },
        ]
      }
      paygroup_employees: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          assigned_by: string | null
          employee_id: string
          id: string
          notes: string | null
          pay_group_id: string | null
          pay_group_master_id: string | null
          removed_at: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          removed_at?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "paygroup_employees_pay_group_master_id_fkey"
            columns: ["pay_group_master_id"]
            isOneToOne: false
            referencedRelation: "pay_group_master"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_configurations: {
        Row: {
          id: string
          organization_id: string | null
          updated_at: string | null
          use_strict_mode: boolean | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          use_strict_mode?: boolean | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          use_strict_mode?: boolean | null
        }
        Relationships: []
      }
      payrun_employees: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          pay_group_id: string
          pay_run_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          pay_group_id: string
          pay_run_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          pay_group_id?: string
          pay_run_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrun_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payrun_employees_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_employees_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
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
            foreignKeyName: "payslip_generations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
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
      permission_cache: {
        Row: {
          context: Json | null
          created_at: string | null
          expires_at: string
          has_permission: boolean
          id: string
          permission: string
          resource: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          expires_at: string
          has_permission: boolean
          id?: string
          permission: string
          resource: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string
          has_permission?: boolean
          id?: string
          permission?: string
          resource?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at: string
          assigned_by: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      sync_configurations: {
        Row: {
          created_at: string | null
          data_mapping: Json | null
          direction: string
          enabled: boolean | null
          filters: Json | null
          frequency: string
          id: string
          integration_name: string
          name: string
          retry_attempts: number | null
          timeout: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_mapping?: Json | null
          direction: string
          enabled?: boolean | null
          filters?: Json | null
          frequency: string
          id?: string
          integration_name: string
          name: string
          retry_attempts?: number | null
          timeout?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_mapping?: Json | null
          direction?: string
          enabled?: boolean | null
          filters?: Json | null
          frequency?: string
          id?: string
          integration_name?: string
          name?: string
          retry_attempts?: number | null
          timeout?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          records_failed: number | null
          records_processed: number | null
          retry_count: number | null
          started_at: string
          status: string
          sync_id: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          retry_count?: number | null
          started_at: string
          status: string
          sync_id: string
          type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_processed?: number | null
          retry_count?: number | null
          started_at?: string
          status?: string
          sync_id?: string
          type?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dashboard_config: Json | null
          id: string
          notification_settings: Json | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dashboard_config?: Json | null
          id?: string
          notification_settings?: Json | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dashboard_config?: Json | null
          id?: string
          notification_settings?: Json | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string
          manager_id: string | null
          organization_id: string | null
          permissions: string[] | null
          restrictions: string[] | null
          role: string
          session_timeout: number | null
          two_factor_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name: string
          manager_id?: string | null
          organization_id?: string | null
          permissions?: string[] | null
          restrictions?: string[] | null
          role: string
          session_timeout?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string
          manager_id?: string | null
          organization_id?: string | null
          permissions?: string[] | null
          restrictions?: string[] | null
          role?: string
          session_timeout?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      paygroup_employees_legacy: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          assigned_by: string | null
          employee_id: string | null
          id: string | null
          notes: string | null
          pay_group_id: string | null
          pay_group_master_id: string | null
          paygroup_id: string | null
          removed_at: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          employee_id?: string | null
          id?: string | null
          notes?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          paygroup_id?: string | null
          removed_at?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          employee_id?: string | null
          id?: string | null
          notes?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          paygroup_id?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "paygroup_employees_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "paygroup_employees_pay_group_master_id_fkey"
            columns: ["paygroup_id"]
            isOneToOne: false
            referencedRelation: "pay_group_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_pay_group_master_id_fkey"
            columns: ["pay_group_master_id"]
            isOneToOne: false
            referencedRelation: "pay_group_master"
            referencedColumns: ["id"]
          },
        ]
      }
      paygroup_employees_view: {
        Row: {
          active: boolean | null
          assigned_on: string | null
          assignment_id: string | null
          employee_country: string | null
          employee_currency: string | null
          employee_email: string | null
          employee_id: string | null
          employee_name: string | null
          employee_status: string | null
          employee_type: string | null
          pay_frequency: Database["public"]["Enums"]["pay_frequency"] | null
          pay_group_country: string | null
          pay_group_id: string | null
          pay_group_name: string | null
          pay_group_type: Database["public"]["Enums"]["pay_group_type"] | null
          pay_rate: number | null
          pay_type: Database["public"]["Enums"]["pay_type"] | null
          removed_at: string | null
        }
        Relationships: []
      }
      super_admin_dashboard: {
        Row: {
          active_sessions: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          recent_activity_count: number | null
          role: string | null
          two_factor_enabled: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_permissions: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      complete_super_admin_setup: {
        Args: { security_questions?: Json; user_id: string }
        Returns: boolean
      }
      exec_raw_sql: { Args: { query: string }; Returns: Json }
      generate_employee_number: {
        Args: {
          in_country: string
          in_department: string
          in_employee_type: string
          in_pay_group_id: string
        }
        Returns: string
      }
      generate_temp_password: { Args: never; Returns: string }
      get_super_admin_setup_status: { Args: never; Returns: Json }
      get_user_organization: { Args: never; Returns: string }
      get_user_role:
        | { Args: { user_id: string }; Returns: string }
        | { Args: never; Returns: string }
      has_permission: {
        Args: { permission_name: string; user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_first_login: { Args: { user_id: string }; Returns: boolean }
      log_health_check: {
        Args: {
          p_critical_issues_count: number
          p_health_score: number
          p_health_status: string
          p_passed_checks: number
          p_report_data: Json
          p_total_checks: number
        }
        Returns: undefined
      }
      send_super_admin_setup_email: {
        Args: { temp_password: string; user_email: string }
        Returns: boolean
      }
      ug_lst_annual_amount: { Args: { gross_pay: number }; Returns: number }
      validate_pay_group_id: {
        Args: { pay_group_id: string }
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
      pay_frequency: "weekly" | "biweekly" | "monthly" | "daily_rate"
      pay_frequency_old:
        | "weekly"
        | "bi_weekly"
        | "monthly"
        | "custom"
        | "Monthly"
      pay_group_type:
        | "local"
        | "expatriate"
        | "contractor"
        | "intern"
        | "temporary"
        | "Expatriate"
        | "Local"
      pay_item_status: "draft" | "pending" | "approved" | "paid"
      pay_run_status: "draft" | "pending_approval" | "approved" | "processed"
      pay_type: "hourly" | "salary" | "piece_rate" | "daily_rate"
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
      pay_frequency: ["weekly", "biweekly", "monthly", "daily_rate"],
      pay_frequency_old: [
        "weekly",
        "bi_weekly",
        "monthly",
        "custom",
        "Monthly",
      ],
      pay_group_type: [
        "local",
        "expatriate",
        "contractor",
        "intern",
        "temporary",
        "Expatriate",
        "Local",
      ],
      pay_item_status: ["draft", "pending", "approved", "paid"],
      pay_run_status: ["draft", "pending_approval", "approved", "processed"],
      pay_type: ["hourly", "salary", "piece_rate", "daily_rate"],
    },
  },
} as const
