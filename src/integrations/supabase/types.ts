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
      access_grants: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          effect: string
          id: string
          org_id: string
          reason: string | null
          role_id: string | null
          scope_key: string
          scope_type: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effect: string
          id?: string
          org_id: string
          reason?: string | null
          role_id?: string | null
          scope_key: string
          scope_type: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effect?: string
          id?: string
          org_id?: string
          reason?: string | null
          role_id?: string | null
          scope_key?: string
          scope_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          organization_id: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      approval_workflow_steps: {
        Row: {
          approver_role: string | null
          approver_type: string | null
          approver_user_id: string | null
          created_at: string | null
          fallback_user_id: string | null
          id: string
          level: number
          notify_email: boolean | null
          notify_in_app: boolean | null
          sequence_number: number
          workflow_id: string
        }
        Insert: {
          approver_role?: string | null
          approver_type?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          fallback_user_id?: string | null
          id?: string
          level: number
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          sequence_number: number
          workflow_id: string
        }
        Update: {
          approver_role?: string | null
          approver_type?: string | null
          approver_user_id?: string | null
          created_at?: string | null
          fallback_user_id?: string | null
          id?: string
          level?: number
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          sequence_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          version: number
          workflow_id: string
          workflow_snapshot: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          version: number
          workflow_id: string
          workflow_snapshot: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          version?: number
          workflow_id?: string
          workflow_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          applies_to_scopes: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          org_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          applies_to_scopes?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          org_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          applies_to_scopes?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string | null
          version?: number | null
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
      auth_events: {
        Row: {
          event_type: string
          geo_location: Json | null
          id: string
          ip_address: unknown
          metadata: Json | null
          org_id: string | null
          reason: string | null
          success: boolean
          timestamp_utc: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id?: string | null
          reason?: string | null
          success: boolean
          timestamp_utc?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id?: string | null
          reason?: string | null
          success?: boolean
          timestamp_utc?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          name: string
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: string
          name: string
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          name?: string
          swift_code?: string | null
          updated_at?: string | null
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
      cleanup_logs: {
        Row: {
          action: string
          auth_user_id: string | null
          created_at: string
          details: Json
          email: string | null
          id: string
          invite_id: string | null
          reason: string
        }
        Insert: {
          action: string
          auth_user_id?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          id?: string
          invite_id?: string | null
          reason?: string
        }
        Update: {
          action?: string
          auth_user_id?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          id?: string
          invite_id?: string | null
          reason?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          country_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          organization_id: string
          short_code: string | null
          updated_at: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name: string
          organization_id: string
          short_code?: string | null
          updated_at?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          organization_id?: string
          short_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_companies_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      company_unit_categories: {
        Row: {
          category_id: string
          company_unit_id: string
          created_at: string
          id: string
        }
        Insert: {
          category_id: string
          company_unit_id: string
          created_at?: string
          id?: string
        }
        Update: {
          category_id?: string
          company_unit_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_unit_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_unit_categories_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
        ]
      }
      company_units: {
        Row: {
          active: boolean | null
          category_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          kind: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          kind?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          kind?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_units_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_pay_run_items: {
        Row: {
          contract_rate: number
          contract_type: string | null
          contractor_fees: number | null
          created_at: string
          employee_id: string
          gross_pay: number
          hours_worked: number | null
          id: string
          invoice_number: string | null
          milestone_completion: number | null
          net_pay: number
          notes: string | null
          pay_run_id: string
          payment_terms: string | null
          project_hours: number | null
          project_id: string | null
          status: string
          updated_at: string
          withholding_tax: number
        }
        Insert: {
          contract_rate?: number
          contract_type?: string | null
          contractor_fees?: number | null
          created_at?: string
          employee_id: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          invoice_number?: string | null
          milestone_completion?: number | null
          net_pay?: number
          notes?: string | null
          pay_run_id: string
          payment_terms?: string | null
          project_hours?: number | null
          project_id?: string | null
          status?: string
          updated_at?: string
          withholding_tax?: number
        }
        Update: {
          contract_rate?: number
          contract_type?: string | null
          contractor_fees?: number | null
          created_at?: string
          employee_id?: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          invoice_number?: string | null
          milestone_completion?: number | null
          net_pay?: number
          notes?: string | null
          pay_run_id?: string
          payment_terms?: string | null
          project_hours?: number | null
          project_id?: string | null
          status?: string
          updated_at?: string
          withholding_tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "contractor_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "contractor_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
      email_events: {
        Row: {
          category: string
          created_at: string | null
          description: string
          key: string
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          key: string
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          key?: string
          variables?: Json
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          body_html: string
          created_at: string | null
          error_message: string | null
          event_key: string
          id: string
          next_retry_at: string | null
          org_id: string | null
          provider_msg_id: string | null
          recipient_email: string
          recipient_name: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          error_message?: string | null
          event_key: string
          id?: string
          next_retry_at?: string | null
          org_id?: string | null
          provider_msg_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          error_message?: string | null
          event_key?: string
          id?: string
          next_retry_at?: string | null
          org_id?: string | null
          provider_msg_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_placeholders: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          example_value: string | null
          is_locked: boolean
          key: string
          label: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          example_value?: string | null
          is_locked?: boolean
          key: string
          label: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          example_value?: string | null
          is_locked?: boolean
          key?: string
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html_template: string
          created_at: string | null
          design: Json | null
          event_key: string
          id: string
          is_active: boolean
          org_id: string | null
          subject_template: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          body_html_template: string
          created_at?: string | null
          design?: Json | null
          event_key: string
          id?: string
          is_active?: boolean
          org_id?: string | null
          subject_template: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          body_html_template?: string
          created_at?: string | null
          design?: Json | null
          event_key?: string
          id?: string
          is_active?: boolean
          org_id?: string | null
          subject_template?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_event_key_fkey"
            columns: ["event_key"]
            isOneToOne: false
            referencedRelation: "email_events"
            referencedColumns: ["key"]
          },
        ]
      }
      email_triggers: {
        Row: {
          event_key: string
          id: string
          is_enabled: boolean
          org_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          event_key: string
          id?: string
          is_enabled?: boolean
          org_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          event_key?: string
          id?: string
          is_enabled?: boolean
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_triggers_event_key_fkey"
            columns: ["event_key"]
            isOneToOne: false
            referencedRelation: "email_events"
            referencedColumns: ["key"]
          },
        ]
      }
      employee_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          label: string
          organization_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          organization_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_number_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_number_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          id: string
          include_country_code: boolean
          next_sequence: number
          number_format: string
          sequence_digits: number
          sub_department_rules: Json
          updated_at: string
          use_employment_type: boolean
          use_sub_department_prefix: boolean
        }
        Insert: {
          country_rules?: Json
          created_at?: string
          custom_format?: string | null
          custom_prefix_per_pay_group?: boolean
          default_prefix?: string
          id?: string
          include_country_code?: boolean
          next_sequence?: number
          number_format?: string
          sequence_digits?: number
          sub_department_rules?: Json
          updated_at?: string
          use_employment_type?: boolean
          use_sub_department_prefix?: boolean
        }
        Update: {
          country_rules?: Json
          created_at?: string
          custom_format?: string | null
          custom_prefix_per_pay_group?: boolean
          default_prefix?: string
          id?: string
          include_country_code?: boolean
          next_sequence?: number
          number_format?: string
          sequence_digits?: number
          sub_department_rules?: Json
          updated_at?: string
          use_employment_type?: boolean
          use_sub_department_prefix?: boolean
        }
        Relationships: []
      }
      employee_types: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_number: string | null
          account_type: string | null
          bank_branch: string | null
          bank_name: string | null
          category: string | null
          company_id: string | null
          company_unit_id: string | null
          country: string
          created_at: string
          currency: string | null
          date_joined: string | null
          date_of_birth: string | null
          email: string
          employee_category: string | null
          employee_number: string
          employee_type: string
          employee_type_id: string | null
          employment_status: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          national_id: string | null
          nssf_number: string | null
          number_prefix_override: string | null
          organization_id: string
          passport_number: string | null
          pay_frequency: string | null
          pay_group_id: string | null
          pay_rate: number
          pay_type: Database["public"]["Enums"]["pay_type"]
          phone: string | null
          project: string | null
          project_id: string | null
          social_security_number: string | null
          status: string
          sub_department: string | null
          sub_department_id: string | null
          sub_type: string | null
          tin: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          country: string
          created_at?: string
          currency?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          email: string
          employee_category?: string | null
          employee_number: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          national_id?: string | null
          nssf_number?: string | null
          number_prefix_override?: string | null
          organization_id: string
          passport_number?: string | null
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_rate: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          phone?: string | null
          project?: string | null
          project_id?: string | null
          social_security_number?: string | null
          status?: string
          sub_department?: string | null
          sub_department_id?: string | null
          sub_type?: string | null
          tin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          email?: string
          employee_category?: string | null
          employee_number?: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          national_id?: string | null
          nssf_number?: string | null
          number_prefix_override?: string | null
          organization_id?: string
          passport_number?: string | null
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_rate?: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          phone?: string | null
          project?: string | null
          project_id?: string | null
          social_security_number?: string | null
          status?: string
          sub_department?: string | null
          sub_department_id?: string | null
          sub_type?: string | null
          tin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["sub_department_id"]
            isOneToOne: false
            referencedRelation: "sub_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_employee_type_id_fkey"
            columns: ["employee_type_id"]
            isOneToOne: false
            referencedRelation: "employee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          paygroup_id?: string | null
          tax_country?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expatriate_pay_groups_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expatriate_pay_run_item_allowances: {
        Row: {
          amount: number
          created_at: string
          expatriate_pay_run_item_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expatriate_pay_run_item_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expatriate_pay_run_item_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expatriate_pay_run_item_allowan_expatriate_pay_run_item_id_fkey"
            columns: ["expatriate_pay_run_item_id"]
            isOneToOne: false
            referencedRelation: "expatriate_pay_run_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_item_allowances_item_id_fkey"
            columns: ["expatriate_pay_run_item_id"]
            isOneToOne: false
            referencedRelation: "expatriate_pay_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      expatriate_pay_run_items: {
        Row: {
          allowances_foreign: number | null
          base_currency: string | null
          created_at: string | null
          currency: string
          daily_rate: number
          days_worked: number
          education_allowance: number | null
          employee_id: string | null
          exchange_rate: number | null
          exchange_rate_to_local: number
          expatriate_pay_group_id: string | null
          foreign_currency: string
          gross_foreign: number
          gross_local: number
          housing_allowance: number | null
          id: string
          local_currency: string
          local_gross_pay: number | null
          local_net_pay: number | null
          medical_allowance: number | null
          net_foreign: number
          net_local: number
          notes: string | null
          organization_id: string
          pay_run_id: string | null
          status: string
          tax_country: string
          tax_rate: number | null
          transport_allowance: number | null
          updated_at: string | null
        }
        Insert: {
          allowances_foreign?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency: string
          daily_rate: number
          days_worked?: number
          education_allowance?: number | null
          employee_id?: string | null
          exchange_rate?: number | null
          exchange_rate_to_local: number
          expatriate_pay_group_id?: string | null
          foreign_currency?: string
          gross_foreign?: number
          gross_local: number
          housing_allowance?: number | null
          id?: string
          local_currency?: string
          local_gross_pay?: number | null
          local_net_pay?: number | null
          medical_allowance?: number | null
          net_foreign: number
          net_local: number
          notes?: string | null
          organization_id: string
          pay_run_id?: string | null
          status?: string
          tax_country: string
          tax_rate?: number | null
          transport_allowance?: number | null
          updated_at?: string | null
        }
        Update: {
          allowances_foreign?: number | null
          base_currency?: string | null
          created_at?: string | null
          currency?: string
          daily_rate?: number
          days_worked?: number
          education_allowance?: number | null
          employee_id?: string | null
          exchange_rate?: number | null
          exchange_rate_to_local?: number
          expatriate_pay_group_id?: string | null
          foreign_currency?: string
          gross_foreign?: number
          gross_local?: number
          housing_allowance?: number | null
          id?: string
          local_currency?: string
          local_gross_pay?: number | null
          local_net_pay?: number | null
          medical_allowance?: number | null
          net_foreign?: number
          net_local?: number
          notes?: string | null
          organization_id?: string
          pay_run_id?: string | null
          status?: string
          tax_country?: string
          tax_rate?: number | null
          transport_allowance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expatriate_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expatriate_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expatriate_pay_run_items_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      head_office_pay_group_company_units: {
        Row: {
          active: boolean | null
          company_unit_id: string
          created_at: string | null
          id: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
        }
        Insert: {
          active?: boolean | null
          company_unit_id: string
          created_at?: string | null
          id?: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
        }
        Update: {
          active?: boolean | null
          company_unit_id?: string
          created_at?: string | null
          id?: string
          pay_group_id?: string
          pay_group_type?: Database["public"]["Enums"]["head_office_pay_group_type"]
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_group_company_units_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_group_members: {
        Row: {
          active: boolean | null
          added_at: string | null
          added_by: string | null
          employee_id: string
          id: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
          removed_at: string | null
        }
        Insert: {
          active?: boolean | null
          added_at?: string | null
          added_by?: string | null
          employee_id: string
          id?: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
          removed_at?: string | null
        }
        Update: {
          active?: boolean | null
          added_at?: string | null
          added_by?: string | null
          employee_id?: string
          id?: string
          pay_group_id?: string
          pay_group_type?: Database["public"]["Enums"]["head_office_pay_group_type"]
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "head_office_pay_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_groups_expatriates: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          employee_type: string | null
          exchange_rate_to_local: number
          id: string
          name: string
          organization_id: string
          pay_frequency: string | null
          period_end: string
          period_start: string
          source_pay_group_id: string | null
          status: Database["public"]["Enums"]["head_office_status"] | null
          tax_country: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          employee_type?: string | null
          exchange_rate_to_local?: number
          id?: string
          name: string
          organization_id: string
          pay_frequency?: string | null
          period_end: string
          period_start: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          tax_country: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          employee_type?: string | null
          exchange_rate_to_local?: number
          id?: string
          name?: string
          organization_id?: string
          pay_frequency?: string | null
          period_end?: string
          period_start?: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          tax_country?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_groups_expatriates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_groups_expatriates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_groups_interns: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          employee_type: string | null
          id: string
          name: string
          organization_id: string
          pay_frequency: string | null
          period_end: string
          period_start: string
          source_pay_group_id: string | null
          status: Database["public"]["Enums"]["head_office_status"] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          employee_type?: string | null
          id?: string
          name: string
          organization_id: string
          pay_frequency?: string | null
          period_end: string
          period_start: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          employee_type?: string | null
          id?: string
          name?: string
          organization_id?: string
          pay_frequency?: string | null
          period_end?: string
          period_start?: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_groups_interns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_groups_interns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_groups_regular: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          employee_type: string | null
          id: string
          name: string
          organization_id: string
          pay_frequency: string | null
          period_end: string
          period_start: string
          source_pay_group_id: string | null
          status: Database["public"]["Enums"]["head_office_status"] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          employee_type?: string | null
          id?: string
          name: string
          organization_id: string
          pay_frequency?: string | null
          period_end: string
          period_start: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          employee_type?: string | null
          id?: string
          name?: string
          organization_id?: string
          pay_frequency?: string | null
          period_end?: string
          period_start?: string
          source_pay_group_id?: string | null
          status?: Database["public"]["Enums"]["head_office_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_groups_regular_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_groups_regular_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_run_items: {
        Row: {
          allowances: number | null
          basic_pay: number | null
          created_at: string | null
          currency: string | null
          employee_id: string
          exchange_rate: number | null
          gross_pay: number | null
          id: string
          net_foreign: number | null
          net_pay: number | null
          nssf: number | null
          other_deductions: number | null
          pay_run_id: string
          paye: number | null
          total_deductions: number | null
        }
        Insert: {
          allowances?: number | null
          basic_pay?: number | null
          created_at?: string | null
          currency?: string | null
          employee_id: string
          exchange_rate?: number | null
          gross_pay?: number | null
          id?: string
          net_foreign?: number | null
          net_pay?: number | null
          nssf?: number | null
          other_deductions?: number | null
          pay_run_id: string
          paye?: number | null
          total_deductions?: number | null
        }
        Update: {
          allowances?: number | null
          basic_pay?: number | null
          created_at?: string | null
          currency?: string | null
          employee_id?: string
          exchange_rate?: number | null
          gross_pay?: number | null
          id?: string
          net_foreign?: number | null
          net_pay?: number | null
          nssf?: number | null
          other_deductions?: number | null
          pay_run_id?: string
          paye?: number | null
          total_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "head_office_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "head_office_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "head_office_pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      head_office_pay_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
          pay_period_end: string
          pay_period_start: string
          pay_run_date: string | null
          pay_run_id: string | null
          status: string | null
          total_deductions: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id: string
          pay_group_id: string
          pay_group_type: Database["public"]["Enums"]["head_office_pay_group_type"]
          pay_period_end: string
          pay_period_start: string
          pay_run_date?: string | null
          pay_run_id?: string | null
          status?: string | null
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string
          pay_group_id?: string
          pay_group_type?: Database["public"]["Enums"]["head_office_pay_group_type"]
          pay_period_end?: string
          pay_period_start?: string
          pay_run_date?: string | null
          pay_run_id?: string | null
          status?: string | null
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "head_office_pay_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          created_at: string | null
          id: string
          impersonation_end: string | null
          impersonation_start: string
          ip_address: unknown
          super_admin_id: string
          target_organization_id: string | null
          target_role: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impersonation_end?: string | null
          impersonation_start: string
          ip_address?: unknown
          super_admin_id: string
          target_organization_id?: string | null
          target_role: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impersonation_end?: string | null
          impersonation_start?: string
          ip_address?: unknown
          super_admin_id?: string
          target_organization_id?: string | null
          target_role?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      intern_pay_run_items: {
        Row: {
          created_at: string
          employee_id: string
          gross_pay: number
          hours_worked: number | null
          id: string
          internship_duration_months: number | null
          learning_hours: number | null
          learning_objectives: string[] | null
          mentor_id: string | null
          net_pay: number
          notes: string | null
          pay_run_id: string
          project_hours: number | null
          status: string
          stipend_amount: number
          sub_department: string | null
          tax_deduction: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          internship_duration_months?: number | null
          learning_hours?: number | null
          learning_objectives?: string[] | null
          mentor_id?: string | null
          net_pay?: number
          notes?: string | null
          pay_run_id: string
          project_hours?: number | null
          status?: string
          stipend_amount?: number
          sub_department?: string | null
          tax_deduction?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          internship_duration_months?: number | null
          learning_hours?: number | null
          learning_objectives?: string[] | null
          mentor_id?: string | null
          net_pay?: number
          notes?: string | null
          pay_run_id?: string
          project_hours?: number | null
          status?: string
          stipend_amount?: number
          sub_department?: string | null
          tax_deduction?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      local_pay_run_items: {
        Row: {
          basic_salary: number
          benefit_deductions: number
          created_at: string
          custom_deductions: number
          employee_id: string
          gross_pay: number
          hours_worked: number | null
          id: string
          local_currency: string
          net_pay: number
          notes: string | null
          nssf_employee: number | null
          nssf_employer: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          pay_run_id: string
          paye_tax: number | null
          piece_rate: number | null
          pieces_completed: number | null
          status: string
          tax_deduction: number
          total_deductions: number
          updated_at: string
        }
        Insert: {
          basic_salary?: number
          benefit_deductions?: number
          created_at?: string
          custom_deductions?: number
          employee_id: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          local_currency?: string
          net_pay?: number
          notes?: string | null
          nssf_employee?: number | null
          nssf_employer?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          pay_run_id: string
          paye_tax?: number | null
          piece_rate?: number | null
          pieces_completed?: number | null
          status?: string
          tax_deduction?: number
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          basic_salary?: number
          benefit_deductions?: number
          created_at?: string
          custom_deductions?: number
          employee_id?: string
          gross_pay?: number
          hours_worked?: number | null
          id?: string
          local_currency?: string
          net_pay?: number
          notes?: string | null
          nssf_employee?: number | null
          nssf_employer?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          pay_run_id?: string
          paye_tax?: number | null
          piece_rate?: number | null
          pieces_completed?: number | null
          status?: string
          tax_deduction?: number
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "local_pay_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_pay_run_items_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lst_employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "lst_employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
      notification_templates: {
        Row: {
          available_variables: Json | null
          body_content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          module: string
          name: string
          org_id: string | null
          subject: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          available_variables?: Json | null
          body_content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          name: string
          org_id?: string | null
          subject: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          available_variables?: Json | null
          body_content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          name?: string
          org_id?: string | null
          subject?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_license_assignments: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          seat_type: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          seat_type?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          seat_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_license_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_licenses: {
        Row: {
          created_at: string
          effective_from: string
          features: Json
          org_id: string
          seat_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          features?: Json
          org_id: string
          seat_limit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          features?: Json
          org_id?: string
          seat_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_licenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          org_id: string
          system_defined: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          org_id: string
          system_defined?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          org_id?: string
          system_defined?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          approvals_allow_delegation: boolean
          approvals_enabled_scopes: Json | null
          approvals_rejection_comment_required: boolean
          approvals_sequential: boolean
          approvals_visibility_non_admin: boolean
          created_at: string | null
          id: string
          max_approval_levels: number
          org_id: string
          organization_id: string
          payroll_approvals_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          approvals_allow_delegation?: boolean
          approvals_enabled_scopes?: Json | null
          approvals_rejection_comment_required?: boolean
          approvals_sequential?: boolean
          approvals_visibility_non_admin?: boolean
          created_at?: string | null
          id?: string
          max_approval_levels?: number
          org_id: string
          organization_id: string
          payroll_approvals_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approvals_allow_delegation?: boolean
          approvals_enabled_scopes?: Json | null
          approvals_rejection_comment_required?: boolean
          approvals_sequential?: boolean
          approvals_visibility_non_admin?: boolean
          created_at?: string | null
          id?: string
          max_approval_levels?: number
          org_id?: string
          organization_id?: string
          payroll_approvals_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      org_user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_user_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_user_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_user_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_user_roles_org_user_id_fkey"
            columns: ["org_user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_security_settings: {
        Row: {
          created_at: string | null
          email_alerts_enabled: boolean
          id: string
          lockout_threshold: number
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_alerts_enabled?: boolean
          id?: string
          lockout_threshold?: number
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_alerts_enabled?: boolean
          id?: string
          lockout_threshold?: number
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_security_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_company_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_company_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_company_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_calculation_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
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
            referencedRelation: "master_payrolls"
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
      pay_group_master: {
        Row: {
          active: boolean
          category: string | null
          code: string | null
          country: string | null
          created_at: string
          currency: string | null
          employee_type: string | null
          id: string
          name: string
          organization_id: string | null
          pay_frequency: string | null
          pay_type: string | null
          source_id: string
          source_table: string
          sub_type: string | null
          type: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          employee_type?: string | null
          id?: string
          name: string
          organization_id?: string | null
          pay_frequency?: string | null
          pay_type?: string | null
          source_id: string
          source_table: string
          sub_type?: string | null
          type: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          employee_type?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          pay_frequency?: string | null
          pay_type?: string | null
          source_id?: string
          source_table?: string
          sub_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_group_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_groups: {
        Row: {
          category: string | null
          country: string
          created_at: string
          default_piece_rate: number | null
          default_tax_percentage: number
          description: string | null
          employee_type: string | null
          id: string
          maximum_pieces: number | null
          minimum_pieces: number | null
          name: string
          organization_id: string
          pay_frequency: string | null
          pay_type: string | null
          piece_type: string | null
          project_id: string | null
          project_type: string | null
          tax_country: string
          type: Database["public"]["Enums"]["pay_group_type"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          country: string
          created_at?: string
          default_piece_rate?: number | null
          default_tax_percentage?: number
          description?: string | null
          employee_type?: string | null
          id?: string
          maximum_pieces?: number | null
          minimum_pieces?: number | null
          name: string
          organization_id: string
          pay_frequency?: string | null
          pay_type?: string | null
          piece_type?: string | null
          project_id?: string | null
          project_type?: string | null
          tax_country: string
          type?: Database["public"]["Enums"]["pay_group_type"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          default_piece_rate?: number | null
          default_tax_percentage?: number
          description?: string | null
          employee_type?: string | null
          id?: string
          maximum_pieces?: number | null
          minimum_pieces?: number | null
          name?: string
          organization_id?: string
          pay_frequency?: string | null
          pay_type?: string | null
          piece_type?: string | null
          project_id?: string | null
          project_type?: string | null
          tax_country?: string
          type?: Database["public"]["Enums"]["pay_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pay_groups_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          pay_run_id?: string
          pieces_completed?: number | null
          status?: Database["public"]["Enums"]["pay_item_status"]
          tax_deduction?: number
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pay_items_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
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
            referencedRelation: "master_payrolls"
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
          approval_current_level: number | null
          approval_last_action_at: string | null
          approval_status: string | null
          approval_submitted_at: string | null
          approval_submitted_by: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          days_worked: number | null
          employee_type: string | null
          exchange_rate: number | null
          id: string
          organization_id: string
          pay_frequency: string | null
          pay_group_id: string | null
          pay_group_master_id: string | null
          pay_period_end: string
          pay_period_start: string
          pay_run_date: string
          pay_run_id: string | null
          pay_type: string | null
          payroll_status: string | null
          payroll_type: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["pay_run_status"]
          sub_type: string | null
          total_deductions: number | null
          total_gross: number | null
          total_gross_pay: number | null
          total_net: number | null
          total_net_pay: number | null
          updated_at: string
        }
        Insert: {
          approval_current_level?: number | null
          approval_last_action_at?: string | null
          approval_status?: string | null
          approval_submitted_at?: string | null
          approval_submitted_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          days_worked?: number | null
          employee_type?: string | null
          exchange_rate?: number | null
          id?: string
          organization_id: string
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          pay_period_end: string
          pay_period_start: string
          pay_run_date?: string
          pay_run_id?: string | null
          pay_type?: string | null
          payroll_status?: string | null
          payroll_type?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["pay_run_status"]
          sub_type?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_gross_pay?: number | null
          total_net?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Update: {
          approval_current_level?: number | null
          approval_last_action_at?: string | null
          approval_status?: string | null
          approval_submitted_at?: string | null
          approval_submitted_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          days_worked?: number | null
          employee_type?: string | null
          exchange_rate?: number | null
          id?: string
          organization_id?: string
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_group_master_id?: string | null
          pay_period_end?: string
          pay_period_start?: string
          pay_run_date?: string
          pay_run_id?: string | null
          pay_type?: string | null
          payroll_status?: string | null
          payroll_type?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["pay_run_status"]
          sub_type?: string | null
          total_deductions?: number | null
          total_gross?: number | null
          total_gross_pay?: number | null
          total_net?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pay_runs_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pay_runs_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pay_runs_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_pay_group_master_id_fkey"
            columns: ["pay_group_master_id"]
            isOneToOne: false
            referencedRelation: "pay_group_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
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
      payroll_approval_categories: {
        Row: {
          category_id: string
          config_id: string
        }
        Insert: {
          category_id: string
          config_id: string
        }
        Update: {
          category_id?: string
          config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_approval_categories_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "payroll_approval_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_approval_configs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_approval_configs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
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
      payrun_approval_steps: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          approver_role: string | null
          approver_user_id: string | null
          comments: string | null
          created_at: string | null
          delegated_at: string | null
          delegated_by: string | null
          id: string
          level: number
          original_approver_id: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          payrun_id: string
          status: string
          updated_at: string | null
          workflow_version: number | null
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string | null
          delegated_at?: string | null
          delegated_by?: string | null
          id?: string
          level: number
          original_approver_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          payrun_id: string
          status?: string
          updated_at?: string | null
          workflow_version?: number | null
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          comments?: string | null
          created_at?: string | null
          delegated_at?: string | null
          delegated_by?: string | null
          id?: string
          level?: number
          original_approver_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          payrun_id?: string
          status?: string
          updated_at?: string | null
          workflow_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payrun_approval_steps_actioned_by_fkey"
            columns: ["actioned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approval_steps_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approval_steps_delegated_by_fkey"
            columns: ["delegated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approval_steps_original_approver_id_fkey"
            columns: ["original_approver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approval_steps_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approval_steps_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "payrun_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "master_payrolls"
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_generations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
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
            referencedRelation: "master_payrolls"
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
      platform_admin_devices: {
        Row: {
          admin_id: string
          approved: boolean
          browser: string | null
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          os: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          approved?: boolean
          browser?: string | null
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          os?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          approved?: boolean
          browser?: string | null
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          os?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_devices_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          allowed: boolean
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["platform_admin_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_admin_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_email_settings: {
        Row: {
          default_from_email: string
          default_from_name: string
          default_reply_to: string | null
          enforce_identity: boolean
          id: string
          is_active: boolean
          provider_name: string
          rate_limit_per_tenant: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          default_from_email?: string
          default_from_name?: string
          default_reply_to?: string | null
          enforce_identity?: boolean
          id?: string
          is_active?: boolean
          provider_name?: string
          rate_limit_per_tenant?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          default_from_email?: string
          default_from_name?: string
          default_reply_to?: string | null
          enforce_identity?: boolean
          id?: string
          is_active?: boolean
          provider_name?: string
          rate_limit_per_tenant?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          failed_login_attempts: number
          first_name: string | null
          id: string
          last_name: string | null
          locked_at: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failed_login_attempts?: number
          first_name?: string | null
          id: string
          last_name?: string | null
          locked_at?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failed_login_attempts?: number
          first_name?: string | null
          id?: string
          last_name?: string | null
          locked_at?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_onboarding_steps: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          project_id: string
          step_key: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          step_key: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_onboarding_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          allowed_pay_types: string[] | null
          client_name: string | null
          code: string
          contract_value: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          organization_id: string | null
          project_subtype: string | null
          project_type: string | null
          responsible_manager_id: string | null
          start_date: string | null
          status: string | null
          supports_all_pay_types: boolean
          updated_at: string | null
        }
        Insert: {
          allowed_pay_types?: string[] | null
          client_name?: string | null
          code: string
          contract_value?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id?: string | null
          project_subtype?: string | null
          project_type?: string | null
          responsible_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          supports_all_pay_types?: boolean
          updated_at?: string | null
        }
        Update: {
          allowed_pay_types?: string[] | null
          client_name?: string | null
          code?: string
          contract_value?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string | null
          project_subtype?: string | null
          project_type?: string | null
          responsible_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          supports_all_pay_types?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          org_id: string | null
          role_code: string
          scope_id: string | null
          scope_type: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          role_code: string
          scope_id?: string | null
          scope_type: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          role_code?: string
          scope_id?: string | null
          scope_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_assignments_role_fkey"
            columns: ["role_code", "org_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["code", "org_id"]
          },
        ]
      }
      rbac_grants: {
        Row: {
          created_at: string | null
          effect: string
          granted_by: string | null
          id: string
          permission_key: string
          role_code: string | null
          scope_id: string
          scope_type: string
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          effect: string
          granted_by?: string | null
          id?: string
          permission_key: string
          role_code?: string | null
          scope_id: string
          scope_type: string
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          effect?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          role_code?: string | null
          scope_id?: string
          scope_type?: string
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_grants_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      rbac_permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          key: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          key: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          key?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          org_id: string
          permission_key: string
          role_code: string
        }
        Insert: {
          org_id: string
          permission_key: string
          role_code: string
        }
        Update: {
          org_id?: string
          permission_key?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_fkey"
            columns: ["role_code", "org_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["code", "org_id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          name: string
          org_id: string
          tier: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          name: string
          org_id: string
          tier: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          name?: string
          org_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      security_audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          org_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      sub_departments: {
        Row: {
          company_unit_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_unit_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_unit_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
        ]
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
      tenant_email_settings: {
        Row: {
          custom_from_email: string | null
          custom_from_name: string | null
          custom_reply_to: string | null
          emails_enabled: boolean
          org_id: string
          updated_at: string | null
          updated_by: string | null
          use_custom_sender: boolean
        }
        Insert: {
          custom_from_email?: string | null
          custom_from_name?: string | null
          custom_reply_to?: string | null
          emails_enabled?: boolean
          org_id: string
          updated_at?: string | null
          updated_by?: string | null
          use_custom_sender?: boolean
        }
        Update: {
          custom_from_email?: string | null
          custom_from_name?: string | null
          custom_reply_to?: string | null
          emails_enabled?: boolean
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
          use_custom_sender?: boolean
        }
        Relationships: []
      }
      user_company_memberships: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          inviter_id: string | null
          role_data: Json | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          inviter_id?: string | null
          role_data?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          inviter_id?: string | null
          role_data?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_profiles: {
        Row: {
          activated_at: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          sub_department_id: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
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
          sub_department_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
          sub_department_id?: string | null
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
      employee_master: {
        Row: {
          id: string | null
          organization_id: string | null
        }
        Insert: {
          id?: string | null
          organization_id?: string | null
        }
        Update: {
          id?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pay_groups: {
        Row: {
          assigned_on: string | null
          emp_country: string | null
          emp_currency: string | null
          emp_email: string | null
          emp_employee_type: string | null
          emp_first_name: string | null
          emp_id: string | null
          emp_last_name: string | null
          emp_middle_name: string | null
          emp_pay_rate: number | null
          emp_pay_type: Database["public"]["Enums"]["pay_type"] | null
          employee_id: string | null
          id: string | null
          organization_id: string | null
          pay_group_id: string | null
          unassigned_on: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pay_groups_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      master_payrolls: {
        Row: {
          id: string | null
          organization_id: string | null
          pay_group_id: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          payroll_status: string | null
          total_employees: number | null
          total_gross: number | null
          total_net: number | null
        }
        Insert: {
          id?: string | null
          organization_id?: string | null
          pay_group_id?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payroll_status?: string | null
          total_employees?: never
          total_gross?: number | null
          total_net?: number | null
        }
        Update: {
          id?: string | null
          organization_id?: string | null
          pay_group_id?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payroll_status?: string | null
          total_employees?: never
          total_gross?: number | null
          total_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pay_runs_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pay_runs_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          assignment_id: string | null
          category: string | null
          employee_id: string | null
          employee_type: string | null
          pay_frequency: string | null
          pay_group_id: string | null
          pay_group_name: string | null
          pay_group_type: string | null
          pay_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "paygroup_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      paygroup_summary_view: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          default_daily_rate: number | null
          default_tax_percentage: number | null
          employee_count: number | null
          exchange_rate_to_local: number | null
          id: string | null
          name: string | null
          notes: string | null
          pay_frequency: string | null
          paygroup_id: string | null
          status: string | null
          tax_country: string | null
          type: string | null
          updated_at: string | null
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
      approve_payrun_step: {
        Args: { comments_input?: string; payrun_id_input: string }
        Returns: Json
      }
      can_perform_action: {
        Args: { p_action: string; p_company_id: string; p_org_id: string }
        Returns: boolean
      }
      check_is_org_admin: { Args: { user_id: string }; Returns: boolean }
      check_is_org_super_admin: { Args: { user_id: string }; Returns: boolean }
      check_is_super_admin: { Args: { user_id: string }; Returns: boolean }
      cleanup_expired_permissions: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      complete_super_admin_setup: {
        Args: { security_questions?: Json; user_id: string }
        Returns: boolean
      }
      current_org_id: { Args: never; Returns: string }
      delegate_approval_step: {
        Args: { new_approver_id: string; payrun_id_input: string }
        Returns: Json
      }
      generate_employee_number:
        | {
            Args: {
              in_country: string
              in_department: string
              in_employee_type: string
              in_pay_group_id: string
            }
            Returns: string
          }
        | {
            Args: {
              in_country: string
              in_employee_type: string
              in_pay_group_id: string
              in_prefix_override?: string
              in_sub_department: string
            }
            Returns: string
          }
      generate_temp_password: { Args: never; Returns: string }
      get_auth_org_id: { Args: never; Returns: string }
      get_org_total_payroll: { Args: { org_id: string }; Returns: number }
      get_super_admin_setup_status: { Args: never; Returns: Json }
      get_unread_notification_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_diagnostic_data: { Args: { _email: string }; Returns: Json }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_organization: { Args: never; Returns: string }
      get_user_organization_id: { Args: { user_id: string }; Returns: string }
      get_user_role:
        | { Args: never; Returns: string }
        | { Args: { user_id: string }; Returns: string }
      get_user_sub_department_id: { Args: { user_id: string }; Returns: string }
      has_any_org_role: {
        Args: { p_org_id: string; p_role_keys: string[] }
        Returns: boolean
      }
      has_company_membership: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      has_grant: {
        Args: {
          p_company_id?: string
          p_org_id: string
          p_scope_key: string
          p_scope_type: string
        }
        Returns: boolean
      }
      has_org_role: {
        Args: { p_org_id: string; p_role_key: string }
        Returns: boolean
      }
      has_permission:
        | {
            Args: {
              _permission_key: string
              _scope_id?: string
              _scope_type?: string
              _user_id?: string
            }
            Returns: boolean
          }
        | {
            Args: { p_permission_key: string; p_user_id: string }
            Returns: boolean
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_failed_login_attempts: {
        Args: { _user_id: string }
        Returns: number
      }
      invite_cleanup_candidates: {
        Args: {
          p_include_auth_only?: boolean
          p_limit?: number
          p_older_than_days?: number
          p_require_expired?: boolean
          p_tenant_id?: string
        }
        Returns: {
          auth_created_at: string
          auth_user_id: string
          confirmed_at: string
          eligible: boolean
          email: string
          has_password: boolean
          invite_created_at: string
          invite_expires_at: string
          invite_id: string
          invite_status: string
          invited_at: string
          last_sign_in_at: string
          protected_ref: Json
          source: string
        }[]
      }
      invite_cleanup_find_protected_fk_ref: {
        Args: { p_user_id: string }
        Returns: Json
      }
      ippms_apply_holiday: {
        Args: {
          p_country?: string
          p_holiday_date: string
          p_name: string
          p_project_id: string
        }
        Returns: string
      }
      ippms_apply_leave: {
        Args: {
          p_employee_id: string
          p_end: string
          p_leave_type_id: string
          p_project_id: string
          p_reason?: string
          p_start: string
        }
        Returns: string
      }
      ippms_assign_shift: {
        Args: {
          p_employee_id: string
          p_end: string
          p_project_id: string
          p_shift_id: string
          p_start: string
        }
        Returns: string
      }
      ippms_daily_payrun_rows: {
        Args: { p_end: string; p_project_id: string; p_start: string }
        Returns: {
          attendance_id: string
          daily_rate_snapshot: number
          employee_id: string
          status:
            | "PRESENT"
            | "ABSENT"
            | "OFF"
            | "LEAVE"
            | "UNPAID_LEAVE"
            | "SICK"
            | "PUBLIC_HOLIDAY"
          work_date: string
          work_day_id: string
        }[]
      }
      ippms_generate_attendance_template: {
        Args: { p_project_id: string }
        Returns: {
          attendance_date: string
          employee_id: string
          hours_worked: number
          overtime_hours: number
          remarks: string
          shift_id: string
          status: string
        }[]
      }
      ippms_generate_piecework_template: {
        Args: { p_project_id: string }
        Returns: {
          employee_id: string
          piece_id: string
          quantity: number
          rate_snapshot: number
          work_date: string
        }[]
      }
      ippms_get_attendance: {
        Args: {
          p_employee_id?: string
          p_end: string
          p_project_id: string
          p_start: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "ippms_attendance_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ippms_get_piece_entries: {
        Args: {
          p_employee_id?: string
          p_end: string
          p_project_id: string
          p_start: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "ippms_piece_work_entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ippms_get_shifts: {
        Args: { p_project_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "ippms_shifts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ippms_get_work_days: {
        Args: {
          p_employee_id?: string
          p_end: string
          p_project_id: string
          p_start: string
        }
        Returns: {
          attendance_status:
            | "PRESENT"
            | "ABSENT"
            | "OFF"
            | "LEAVE"
            | "UNPAID_LEAVE"
            | "SICK"
            | "PUBLIC_HOLIDAY"
          employee_id: string
          id: string
          is_locked: boolean
          payrun_id: string
          piece_id: string
          project_id: string
          quantity: number
          rate_snapshot: number
          work_date: string
          work_type:
            | "DAILY_RATE"
            | "PIECE_RATE"
            | "LEAVE"
            | "HOLIDAY"
            | "ABSENT"
            | "OFF"
        }[]
      }
      ippms_import_attendance_template: {
        Args: { p_payload: Json; p_project_id: string }
        Returns: Json
      }
      ippms_import_piecework_template: {
        Args: { p_payload: Json; p_project_id: string }
        Returns: Json
      }
      ippms_lock_daily_payrun: {
        Args: { p_payrun_id: string; p_work_day_ids: string[] }
        Returns: undefined
      }
      ippms_lock_piece_payrun: {
        Args: { p_payrun_id: string; p_piece_entry_ids: string[] }
        Returns: undefined
      }
      ippms_piece_payrun_rows: {
        Args: { p_end: string; p_project_id: string; p_start: string }
        Returns: {
          employee_id: string
          piece_entry_id: string
          piece_id: string
          quantity: number
          rate_snapshot: number
          work_date: string
          work_day_id: string
        }[]
      }
      ippms_save_attendance_bulk: {
        Args: { p_project_id: string; p_records: Json }
        Returns: Json
      }
      ippms_save_piece_entries: {
        Args: { p_project_id: string; p_records: Json }
        Returns: Json
      }
      ippms_update_work_type: {
        Args: {
          p_employee_id: string
          p_project_id: string
          p_work_date: string
          p_work_type:
            | "DAILY_RATE"
            | "PIECE_RATE"
            | "LEAVE"
            | "HOLIDAY"
            | "ABSENT"
            | "OFF"
        }
        Returns: string
      }
      is_first_login: { Args: { user_id: string }; Returns: boolean }
      is_ho_manager: { Args: never; Returns: boolean }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
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
      mark_all_notifications_read: {
        Args: { _user_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { _notification_id: string; _user_id: string }
        Returns: undefined
      }
      reject_payrun_step: {
        Args: { comments_input: string; payrun_id_input: string }
        Returns: Json
      }
      reset_failed_login_attempts: {
        Args: { _user_id: string }
        Returns: undefined
      }
      return_payrun_to_draft: {
        Args: { payrun_id_input: string }
        Returns: Json
      }
      seed_default_categories: { Args: { org_id: string }; Returns: undefined }
      send_super_admin_setup_email: {
        Args: { temp_password: string; user_email: string }
        Returns: boolean
      }
      submit_payrun_for_approval: {
        Args: { payrun_id_input: string }
        Returns: Json
      }
      ug_lst_annual_amount: { Args: { gross_pay: number }; Returns: number }
      validate_pay_group_id: {
        Args: { pay_group_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "employee"
        | "platform_admin"
        | "org_super_admin"
      benefit_type:
        | "health_insurance"
        | "retirement"
        | "dental"
        | "vision"
        | "other"
      head_office_pay_group_type: "regular" | "intern" | "expatriate"
      head_office_status: "draft" | "active" | "locked"
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
        | "piece_rate"
      pay_item_status: "draft" | "pending" | "approved" | "paid"
      pay_run_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "processed"
        | "paid"
        | "completed"
        | "rejected"
      pay_type: "hourly" | "salary" | "piece_rate" | "daily_rate"
      payrunstatus:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "locked"
        | "processed"
      platform_admin_role:
        | "super_admin"
        | "support_admin"
        | "compliance"
        | "billing"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "employee",
        "platform_admin",
        "org_super_admin",
      ],
      benefit_type: [
        "health_insurance",
        "retirement",
        "dental",
        "vision",
        "other",
      ],
      head_office_pay_group_type: ["regular", "intern", "expatriate"],
      head_office_status: ["draft", "active", "locked"],
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
        "piece_rate",
      ],
      pay_item_status: ["draft", "pending", "approved", "paid"],
      pay_run_status: [
        "draft",
        "pending_approval",
        "approved",
        "processed",
        "paid",
        "completed",
        "rejected",
      ],
      pay_type: ["hourly", "salary", "piece_rate", "daily_rate"],
      payrunstatus: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "locked",
        "processed",
      ],
      platform_admin_role: [
        "super_admin",
        "support_admin",
        "compliance",
        "billing",
      ],
    },
  },
} as const
