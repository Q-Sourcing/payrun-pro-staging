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
      anomaly_logs: {
        Row: {
          affected_employee_id: string | null
          affected_record_id: string | null
          affected_record_type: string
          anomaly_type: string
          created_at: string
          description: string
          detected_at: string
          detected_by: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          project_id: string | null
          resolution_action: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          section: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          affected_employee_id?: string | null
          affected_record_id?: string | null
          affected_record_type: string
          anomaly_type: string
          created_at?: string
          description: string
          detected_at?: string
          detected_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          project_id?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section: string
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          affected_employee_id?: string | null
          affected_record_id?: string | null
          affected_record_type?: string
          anomaly_type?: string
          created_at?: string
          description?: string
          detected_at?: string
          detected_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          project_id?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          section?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "approval_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_criteria: {
        Row: {
          created_at: string
          field: string
          id: string
          operator: string
          sequence_number: number
          value: Json
          workflow_id: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          operator: string
          sequence_number?: number
          value?: Json
          workflow_id: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          operator?: string
          sequence_number?: number
          value?: Json
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_criteria_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_followups: {
        Row: {
          created_at: string
          days_after: number
          followup_type: string
          id: string
          is_enabled: boolean
          repeat_interval_days: number | null
          send_at_time: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          days_after?: number
          followup_type?: string
          id?: string
          is_enabled?: boolean
          repeat_interval_days?: number | null
          send_at_time?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          days_after?: number
          followup_type?: string
          id?: string
          is_enabled?: boolean
          repeat_interval_days?: number | null
          send_at_time?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_followups_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_messages: {
        Row: {
          body_content: string
          created_at: string
          event_type: string
          from_type: string
          id: string
          is_active: boolean
          subject: string
          to_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          body_content: string
          created_at?: string
          event_type: string
          from_type?: string
          id?: string
          is_active?: boolean
          subject: string
          to_type?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          body_content?: string
          created_at?: string
          event_type?: string
          from_type?: string
          id?: string
          is_active?: boolean
          subject?: string
          to_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_messages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_steps: {
        Row: {
          approver_department_id: string | null
          approver_designation_id: string | null
          approver_group_id: string | null
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
          approver_department_id?: string | null
          approver_designation_id?: string | null
          approver_group_id?: string | null
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
          approver_department_id?: string | null
          approver_designation_id?: string | null
          approver_group_id?: string | null
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
          updated_by: string | null
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
          updated_by?: string | null
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
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      attendance_daily_summary: {
        Row: {
          attendance_date: string
          created_at: string
          employee_id: string
          first_clock_in: string | null
          id: string
          is_late: boolean | null
          is_locked: boolean
          last_clock_out: string | null
          late_minutes: number | null
          organization_id: string
          overtime_hours: number | null
          payrun_id: string | null
          project_id: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["attendance_status_enum"]
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          employee_id: string
          first_clock_in?: string | null
          id?: string
          is_late?: boolean | null
          is_locked?: boolean
          last_clock_out?: string | null
          late_minutes?: number | null
          organization_id: string
          overtime_hours?: number | null
          payrun_id?: string | null
          project_id?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          employee_id?: string
          first_clock_in?: string | null
          id?: string
          is_late?: boolean | null
          is_locked?: boolean
          last_clock_out?: string | null
          late_minutes?: number | null
          organization_id?: string
          overtime_hours?: number | null
          payrun_id?: string | null
          project_id?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_daily_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_daily_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_summary_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "attendance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_devices: {
        Row: {
          device_id: string
          device_name: string | null
          employee_id: string
          id: string
          is_trusted: boolean
          registered_at: string
        }
        Insert: {
          device_id: string
          device_name?: string | null
          employee_id: string
          id?: string
          is_trusted?: boolean
          registered_at?: string
        }
        Update: {
          device_id?: string
          device_name?: string | null
          employee_id?: string
          id?: string
          is_trusted?: boolean
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_devices_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_policies: {
        Row: {
          allow_self_checkin: boolean
          company_id: string | null
          created_at: string
          default_timezone: string
          geofence_radius_meters: number
          grace_period_minutes: number
          half_day_hours: number
          id: string
          late_threshold_minutes: number
          max_late_per_month: number | null
          organization_id: string
          overtime_enabled: boolean
          overtime_threshold_hours: number
          regularization_auto_approve: boolean
          regularization_enabled: boolean
          require_geolocation: boolean
          updated_at: string
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          allow_self_checkin?: boolean
          company_id?: string | null
          created_at?: string
          default_timezone?: string
          geofence_radius_meters?: number
          grace_period_minutes?: number
          half_day_hours?: number
          id?: string
          late_threshold_minutes?: number
          max_late_per_month?: number | null
          organization_id: string
          overtime_enabled?: boolean
          overtime_threshold_hours?: number
          regularization_auto_approve?: boolean
          regularization_enabled?: boolean
          require_geolocation?: boolean
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          allow_self_checkin?: boolean
          company_id?: string | null
          created_at?: string
          default_timezone?: string
          geofence_radius_meters?: number
          grace_period_minutes?: number
          half_day_hours?: number
          id?: string
          late_threshold_minutes?: number
          max_late_per_month?: number | null
          organization_id?: string
          overtime_enabled?: boolean
          overtime_threshold_hours?: number
          regularization_auto_approve?: boolean
          regularization_enabled?: boolean
          require_geolocation?: boolean
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      attendance_regularization_requests: {
        Row: {
          approval_date: string | null
          approval_notes: string | null
          approved_by: string | null
          attendance_date: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          reason: string
          requested_clock_in: string
          requested_clock_out: string
          status: Database["public"]["Enums"]["regularization_status_enum"]
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          attendance_date: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          reason: string
          requested_clock_in: string
          requested_clock_out: string
          status?: Database["public"]["Enums"]["regularization_status_enum"]
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          attendance_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          reason?: string
          requested_clock_in?: string
          requested_clock_out?: string
          status?: Database["public"]["Enums"]["regularization_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_regularization_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_regularization_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_regularization_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_regularization_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_shift_assignments: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean
          shift_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          shift_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          shift_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "attendance_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_shifts: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          grace_period_minutes: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string
          overtime_threshold: number
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id: string
          overtime_threshold?: number
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          grace_period_minutes?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string
          overtime_threshold?: number
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_time_logs: {
        Row: {
          attendance_mode: Database["public"]["Enums"]["attendance_mode_enum"]
          clock_in_utc: string
          clock_out_utc: string | null
          created_at: string
          device_id: string | null
          employee_id: string
          geofence_id: string | null
          id: string
          is_valid: boolean
          latitude: number | null
          local_clock_in: string
          local_clock_out: string | null
          longitude: number | null
          organization_id: string
          photo_url: string | null
          project_id: string | null
          recorded_by: string | null
          recorded_source: Database["public"]["Enums"]["recorded_source_enum"]
          remarks: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          attendance_mode?: Database["public"]["Enums"]["attendance_mode_enum"]
          clock_in_utc?: string
          clock_out_utc?: string | null
          created_at?: string
          device_id?: string | null
          employee_id: string
          geofence_id?: string | null
          id?: string
          is_valid?: boolean
          latitude?: number | null
          local_clock_in?: string
          local_clock_out?: string | null
          longitude?: number | null
          organization_id: string
          photo_url?: string | null
          project_id?: string | null
          recorded_by?: string | null
          recorded_source?: Database["public"]["Enums"]["recorded_source_enum"]
          remarks?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          attendance_mode?: Database["public"]["Enums"]["attendance_mode_enum"]
          clock_in_utc?: string
          clock_out_utc?: string | null
          created_at?: string
          device_id?: string | null
          employee_id?: string
          geofence_id?: string | null
          id?: string
          is_valid?: boolean
          latitude?: number | null
          local_clock_in?: string
          local_clock_out?: string | null
          longitude?: number | null
          organization_id?: string
          photo_url?: string | null
          project_id?: string | null
          recorded_by?: string | null
          recorded_source?: Database["public"]["Enums"]["recorded_source_enum"]
          remarks?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_time_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_time_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "attendance_time_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_time_logs_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_time_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_time_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          head_user_id: string | null
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
          head_user_id?: string | null
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
          head_user_id?: string | null
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
      contract_templates: {
        Row: {
          body_html: string
          country_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employment_type: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          placeholders: Json
          updated_at: string
          version: number
        }
        Insert: {
          body_html?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          placeholders?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          body_html?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          placeholders?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      designations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_compliance_requirements: {
        Row: {
          category: string | null
          compliance_status: Database["public"]["Enums"]["ehs_compliance_status"]
          created_at: string
          due_date: string | null
          evidence_url: string | null
          id: string
          last_audit_date: string | null
          next_audit_date: string | null
          notes: string | null
          organization_id: string
          regulation_body: string | null
          regulation_name: string
          requirement_description: string
          responsible_person: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          compliance_status?: Database["public"]["Enums"]["ehs_compliance_status"]
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          last_audit_date?: string | null
          next_audit_date?: string | null
          notes?: string | null
          organization_id: string
          regulation_body?: string | null
          regulation_name: string
          requirement_description: string
          responsible_person?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          compliance_status?: Database["public"]["Enums"]["ehs_compliance_status"]
          created_at?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          last_audit_date?: string | null
          next_audit_date?: string | null
          notes?: string | null
          organization_id?: string
          regulation_body?: string | null
          regulation_name?: string
          requirement_description?: string
          responsible_person?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_compliance_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_compliance_requirements_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_compliance_requirements_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_compliance_requirements_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_corrective_actions: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          evidence_url: string | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["ehs_ca_priority"]
          project_id: string | null
          responsible_person: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["ehs_ca_source_type"]
          status: Database["public"]["Enums"]["ehs_ca_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["ehs_ca_priority"]
          project_id?: string | null
          responsible_person?: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["ehs_ca_source_type"]
          status?: Database["public"]["Enums"]["ehs_ca_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["ehs_ca_priority"]
          project_id?: string | null
          responsible_person?: string | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["ehs_ca_source_type"]
          status?: Database["public"]["Enums"]["ehs_ca_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_corrective_actions_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_emergency_drills: {
        Row: {
          actual_date: string | null
          conducted_by: string | null
          created_at: string
          description: string | null
          drill_type: Database["public"]["Enums"]["ehs_drill_type"]
          duration_minutes: number | null
          evacuation_time_seconds: number | null
          id: string
          improvements: string | null
          observations: string | null
          organization_id: string
          participants_count: number | null
          project_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["ehs_drill_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          conducted_by?: string | null
          created_at?: string
          description?: string | null
          drill_type?: Database["public"]["Enums"]["ehs_drill_type"]
          duration_minutes?: number | null
          evacuation_time_seconds?: number | null
          id?: string
          improvements?: string | null
          observations?: string | null
          organization_id: string
          participants_count?: number | null
          project_id?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["ehs_drill_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          conducted_by?: string | null
          created_at?: string
          description?: string | null
          drill_type?: Database["public"]["Enums"]["ehs_drill_type"]
          duration_minutes?: number | null
          evacuation_time_seconds?: number | null
          id?: string
          improvements?: string | null
          observations?: string | null
          organization_id?: string
          participants_count?: number | null
          project_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["ehs_drill_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_emergency_drills_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_emergency_drills_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_emergency_drills_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_emergency_drills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_emergency_drills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_environmental_incidents: {
        Row: {
          cleanup_actions: string | null
          closed_at: string | null
          containment_actions: string | null
          created_at: string
          description: string | null
          id: string
          incident_date: string
          incident_number: string
          location: string | null
          organization_id: string
          project_id: string | null
          regulatory_notification: boolean | null
          reported_by: string | null
          severity: Database["public"]["Enums"]["ehs_environmental_severity"]
          status: string
          title: string
          type: Database["public"]["Enums"]["ehs_environmental_type"]
          updated_at: string
        }
        Insert: {
          cleanup_actions?: string | null
          closed_at?: string | null
          containment_actions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_date?: string
          incident_number?: string
          location?: string | null
          organization_id: string
          project_id?: string | null
          regulatory_notification?: boolean | null
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["ehs_environmental_severity"]
          status?: string
          title: string
          type?: Database["public"]["Enums"]["ehs_environmental_type"]
          updated_at?: string
        }
        Update: {
          cleanup_actions?: string | null
          closed_at?: string | null
          containment_actions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_date?: string
          incident_number?: string
          location?: string | null
          organization_id?: string
          project_id?: string | null
          regulatory_notification?: boolean | null
          reported_by?: string | null
          severity?: Database["public"]["Enums"]["ehs_environmental_severity"]
          status?: string
          title?: string
          type?: Database["public"]["Enums"]["ehs_environmental_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_environmental_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_environmental_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_environmental_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_environmental_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_environmental_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_hazards: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          description: string
          hazard_number: string
          id: string
          observation_type: Database["public"]["Enums"]["ehs_observation_type"]
          organization_id: string
          photos: string[] | null
          project_id: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          risk_level: Database["public"]["Enums"]["ehs_hazard_risk_level"]
          site_location: string | null
          status: Database["public"]["Enums"]["ehs_hazard_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          description: string
          hazard_number?: string
          id?: string
          observation_type?: Database["public"]["Enums"]["ehs_observation_type"]
          organization_id: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level?: Database["public"]["Enums"]["ehs_hazard_risk_level"]
          site_location?: string | null
          status?: Database["public"]["Enums"]["ehs_hazard_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          description?: string
          hazard_number?: string
          id?: string
          observation_type?: Database["public"]["Enums"]["ehs_observation_type"]
          organization_id?: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level?: Database["public"]["Enums"]["ehs_hazard_risk_level"]
          site_location?: string | null
          status?: Database["public"]["Enums"]["ehs_hazard_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_hazards_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_hazards_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_hazards_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_hazards_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_incidents: {
        Row: {
          body_part_affected: string | null
          classification: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string
          description: string | null
          employees_involved: string[] | null
          id: string
          immediate_action_taken: string | null
          incident_date: string
          incident_number: string
          incident_time: string | null
          incident_type: Database["public"]["Enums"]["ehs_incident_type"]
          injury_type: string | null
          investigator_id: string | null
          lost_days: number | null
          organization_id: string
          photos: string[] | null
          project_id: string | null
          reported_by: string | null
          root_cause: string | null
          root_cause_category: string | null
          severity: Database["public"]["Enums"]["ehs_incident_severity"]
          site_location: string | null
          status: Database["public"]["Enums"]["ehs_incident_status"]
          supervisor_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_part_affected?: string | null
          classification?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          employees_involved?: string[] | null
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_number?: string
          incident_time?: string | null
          incident_type?: Database["public"]["Enums"]["ehs_incident_type"]
          injury_type?: string | null
          investigator_id?: string | null
          lost_days?: number | null
          organization_id: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          severity?: Database["public"]["Enums"]["ehs_incident_severity"]
          site_location?: string | null
          status?: Database["public"]["Enums"]["ehs_incident_status"]
          supervisor_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_part_affected?: string | null
          classification?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          employees_involved?: string[] | null
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_number?: string
          incident_time?: string | null
          incident_type?: Database["public"]["Enums"]["ehs_incident_type"]
          injury_type?: string | null
          investigator_id?: string | null
          lost_days?: number | null
          organization_id?: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          severity?: Database["public"]["Enums"]["ehs_incident_severity"]
          site_location?: string | null
          status?: Database["public"]["Enums"]["ehs_incident_status"]
          supervisor_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_inspection_items: {
        Row: {
          auto_hazard_id: string | null
          category: string | null
          checklist_item: string
          created_at: string
          finding_text: string | null
          id: string
          inspection_id: string
          photo_url: string | null
          result: Database["public"]["Enums"]["ehs_inspection_result"] | null
        }
        Insert: {
          auto_hazard_id?: string | null
          category?: string | null
          checklist_item: string
          created_at?: string
          finding_text?: string | null
          id?: string
          inspection_id: string
          photo_url?: string | null
          result?: Database["public"]["Enums"]["ehs_inspection_result"] | null
        }
        Update: {
          auto_hazard_id?: string | null
          category?: string | null
          checklist_item?: string
          created_at?: string
          finding_text?: string | null
          id?: string
          inspection_id?: string
          photo_url?: string | null
          result?: Database["public"]["Enums"]["ehs_inspection_result"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ehs_inspection_items_auto_hazard_id_fkey"
            columns: ["auto_hazard_id"]
            isOneToOne: false
            referencedRelation: "ehs_hazards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "ehs_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_inspection_templates: {
        Row: {
          category: string | null
          checklist_items: Json
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          checklist_items?: Json
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          checklist_items?: Json
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_inspection_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_inspections: {
        Row: {
          company_id: string | null
          completed_date: string | null
          created_at: string
          id: string
          inspection_number: string
          inspector_id: string | null
          notes: string | null
          organization_id: string
          overall_score: number | null
          project_id: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["ehs_inspection_status"]
          template_id: string | null
          type: Database["public"]["Enums"]["ehs_inspection_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_number?: string
          inspector_id?: string | null
          notes?: string | null
          organization_id: string
          overall_score?: number | null
          project_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["ehs_inspection_status"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["ehs_inspection_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_number?: string
          inspector_id?: string | null
          notes?: string | null
          organization_id?: string
          overall_score?: number | null
          project_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["ehs_inspection_status"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["ehs_inspection_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ehs_inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_permits: {
        Row: {
          approved_by: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          emergency_procedures: string | null
          id: string
          location: string | null
          organization_id: string
          permit_number: string
          permit_type: Database["public"]["Enums"]["ehs_permit_type"]
          precautions: string | null
          project_id: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["ehs_permit_status"]
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          emergency_procedures?: string | null
          id?: string
          location?: string | null
          organization_id: string
          permit_number?: string
          permit_type?: Database["public"]["Enums"]["ehs_permit_type"]
          precautions?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["ehs_permit_status"]
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          emergency_procedures?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          permit_number?: string
          permit_type?: Database["public"]["Enums"]["ehs_permit_type"]
          precautions?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["ehs_permit_status"]
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ehs_permits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_permits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_permits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_permits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_ppe_records: {
        Row: {
          condition: Database["public"]["Enums"]["ehs_ppe_condition"]
          created_at: string
          employee_id: string
          id: string
          issued_date: string
          last_inspection_date: string | null
          next_inspection_date: string | null
          notes: string | null
          organization_id: string
          ppe_type_id: string
          project_id: string | null
          returned_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["ehs_ppe_status"]
          updated_at: string
        }
        Insert: {
          condition?: Database["public"]["Enums"]["ehs_ppe_condition"]
          created_at?: string
          employee_id: string
          id?: string
          issued_date?: string
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          organization_id: string
          ppe_type_id: string
          project_id?: string | null
          returned_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["ehs_ppe_status"]
          updated_at?: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["ehs_ppe_condition"]
          created_at?: string
          employee_id?: string
          id?: string
          issued_date?: string
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          organization_id?: string
          ppe_type_id?: string
          project_id?: string | null
          returned_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["ehs_ppe_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_ppe_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_ppe_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_ppe_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_ppe_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_ppe_records_ppe_type_id_fkey"
            columns: ["ppe_type_id"]
            isOneToOne: false
            referencedRelation: "ehs_ppe_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_ppe_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_ppe_types: {
        Row: {
          category: string | null
          created_at: string
          id: string
          inspection_interval_days: number | null
          lifespan_months: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          inspection_interval_days?: number | null
          lifespan_months?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          inspection_interval_days?: number | null
          lifespan_months?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_ppe_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_risk_assessment_items: {
        Row: {
          additional_controls: string | null
          assessment_id: string
          consequence: string | null
          consequence_after:
            | Database["public"]["Enums"]["ehs_risk_consequence"]
            | null
          consequence_before: Database["public"]["Enums"]["ehs_risk_consequence"]
          created_at: string
          existing_controls: string | null
          hazard_description: string
          id: string
          likelihood_after:
            | Database["public"]["Enums"]["ehs_risk_likelihood"]
            | null
          likelihood_before: Database["public"]["Enums"]["ehs_risk_likelihood"]
          responsible_person: string | null
          risk_score_after: number | null
          risk_score_before: number | null
          sort_order: number
        }
        Insert: {
          additional_controls?: string | null
          assessment_id: string
          consequence?: string | null
          consequence_after?:
            | Database["public"]["Enums"]["ehs_risk_consequence"]
            | null
          consequence_before?: Database["public"]["Enums"]["ehs_risk_consequence"]
          created_at?: string
          existing_controls?: string | null
          hazard_description: string
          id?: string
          likelihood_after?:
            | Database["public"]["Enums"]["ehs_risk_likelihood"]
            | null
          likelihood_before?: Database["public"]["Enums"]["ehs_risk_likelihood"]
          responsible_person?: string | null
          risk_score_after?: number | null
          risk_score_before?: number | null
          sort_order?: number
        }
        Update: {
          additional_controls?: string | null
          assessment_id?: string
          consequence?: string | null
          consequence_after?:
            | Database["public"]["Enums"]["ehs_risk_consequence"]
            | null
          consequence_before?: Database["public"]["Enums"]["ehs_risk_consequence"]
          created_at?: string
          existing_controls?: string | null
          hazard_description?: string
          id?: string
          likelihood_after?:
            | Database["public"]["Enums"]["ehs_risk_likelihood"]
            | null
          likelihood_before?: Database["public"]["Enums"]["ehs_risk_likelihood"]
          responsible_person?: string | null
          risk_score_after?: number | null
          risk_score_before?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ehs_risk_assessment_items_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "ehs_risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessment_items_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessment_items_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_risk_assessment_items_responsible_person_fkey"
            columns: ["responsible_person"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_risk_assessments: {
        Row: {
          approved_by: string | null
          assessed_by: string | null
          assessment_date: string
          assessment_number: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          job_activity: string | null
          location: string | null
          organization_id: string
          project_id: string | null
          review_date: string | null
          status: Database["public"]["Enums"]["ehs_risk_assessment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          assessed_by?: string | null
          assessment_date?: string
          assessment_number?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_activity?: string | null
          location?: string | null
          organization_id: string
          project_id?: string | null
          review_date?: string | null
          status?: Database["public"]["Enums"]["ehs_risk_assessment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          assessed_by?: string | null
          assessment_date?: string
          assessment_number?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_activity?: string | null
          location?: string | null
          organization_id?: string
          project_id?: string | null
          review_date?: string | null
          status?: Database["public"]["Enums"]["ehs_risk_assessment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_risk_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_risk_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ehs_training_records: {
        Row: {
          certificate_number: string | null
          certificate_url: string | null
          completed_date: string | null
          course_name: string
          created_at: string
          employee_id: string
          expiry_date: string | null
          id: string
          organization_id: string
          project_id: string | null
          provider: string | null
          status: Database["public"]["Enums"]["ehs_training_status"]
          trainer: string | null
          training_type: Database["public"]["Enums"]["ehs_training_type"]
          updated_at: string
        }
        Insert: {
          certificate_number?: string | null
          certificate_url?: string | null
          completed_date?: string | null
          course_name: string
          created_at?: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["ehs_training_status"]
          trainer?: string | null
          training_type?: Database["public"]["Enums"]["ehs_training_type"]
          updated_at?: string
        }
        Update: {
          certificate_number?: string | null
          certificate_url?: string | null
          completed_date?: string | null
          course_name?: string
          created_at?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["ehs_training_status"]
          trainer?: string | null
          training_type?: Database["public"]["Enums"]["ehs_training_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ehs_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ehs_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_training_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ehs_training_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      employee_addresses: {
        Row: {
          address_type: string
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          employee_id: string
          id: string
          is_primary: boolean
          line_1: string
          line_2: string | null
          organization_id: string
          postal_code: string | null
          source: string
          state_region: string | null
          updated_at: string
        }
        Insert: {
          address_type: string
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          employee_id: string
          id?: string
          is_primary?: boolean
          line_1: string
          line_2?: string | null
          organization_id: string
          postal_code?: string | null
          source?: string
          state_region?: string | null
          updated_at?: string
        }
        Update: {
          address_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          employee_id?: string
          id?: string
          is_primary?: boolean
          line_1?: string
          line_2?: string | null
          organization_id?: string
          postal_code?: string | null
          source?: string
          state_region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      employee_contracts: {
        Row: {
          auto_renew: boolean
          body_html: string | null
          contract_number: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          salary_snapshot: Json | null
          signed_by_employee_at: string | null
          signed_by_employer_at: string | null
          signed_by_employer_name: string | null
          start_date: string | null
          status: string
          template_id: string | null
          terms_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          body_html?: string | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          salary_snapshot?: Json | null
          signed_by_employee_at?: string | null
          signed_by_employer_at?: string | null
          signed_by_employer_name?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          terms_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          body_html?: string | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          salary_snapshot?: Json | null
          signed_by_employee_at?: string | null
          signed_by_employer_at?: string | null
          signed_by_employer_name?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          terms_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_dependents: {
        Row: {
          contact_phone: string | null
          created_at: string
          date_of_birth: string | null
          employee_id: string
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          relationship: string
          source: string
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          employee_id: string
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          relationship: string
          source?: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          employee_id?: string
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          relationship?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_dependents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          employee_id: string
          external_document_id: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          organization_id: string
          source: string
          storage_bucket: string | null
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          employee_id: string
          external_document_id?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          source?: string
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          employee_id?: string
          external_document_id?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          source?: string
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_education: {
        Row: {
          created_at: string
          date_of_completion: string | null
          degree_diploma: string | null
          employee_id: string
          end_date: string | null
          id: string
          institution_name: string
          organization_id: string
          source: string
          specialization: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_completion?: string | null
          degree_diploma?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          institution_name: string
          organization_id: string
          source?: string
          specialization?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_completion?: string | null
          degree_diploma?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          institution_name?: string
          organization_id?: string
          source?: string
          specialization?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_education_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_external_ids: {
        Row: {
          created_at: string
          employee_id: string
          external_id: string
          external_label: string | null
          external_record_id: string | null
          id: string
          last_inbound_synced_at: string | null
          last_outbound_synced_at: string | null
          last_seen_at: string | null
          metadata: Json
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          external_id: string
          external_label?: string | null
          external_record_id?: string | null
          id?: string
          last_inbound_synced_at?: string | null
          last_outbound_synced_at?: string | null
          last_seen_at?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          external_id?: string
          external_label?: string | null
          external_record_id?: string | null
          id?: string
          last_inbound_synced_at?: string | null
          last_outbound_synced_at?: string | null
          last_seen_at?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_external_ids_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_external_ids_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_external_ids_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_external_ids_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_geofences: {
        Row: {
          allowed: boolean
          created_at: string
          employee_id: string
          geofence_id: string
          id: string
          priority: number
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          employee_id: string
          geofence_id: string
          id?: string
          priority?: number
        }
        Update: {
          allowed?: boolean
          created_at?: string
          employee_id?: string
          geofence_id?: string
          id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_geofences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_geofences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_geofences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_geofences_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
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
      employee_time_policies: {
        Row: {
          attendance_mode: Database["public"]["Enums"]["attendance_mode_enum"]
          attendance_required: boolean
          created_at: string
          employee_id: string
          id: string
          timesheet_required: boolean
          tracking_type: Database["public"]["Enums"]["tracking_type_enum"]
          updated_at: string
        }
        Insert: {
          attendance_mode?: Database["public"]["Enums"]["attendance_mode_enum"]
          attendance_required?: boolean
          created_at?: string
          employee_id: string
          id?: string
          timesheet_required?: boolean
          tracking_type?: Database["public"]["Enums"]["tracking_type_enum"]
          updated_at?: string
        }
        Update: {
          attendance_mode?: Database["public"]["Enums"]["attendance_mode_enum"]
          attendance_required?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          timesheet_required?: boolean
          tracking_type?: Database["public"]["Enums"]["tracking_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_policies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_policies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_time_policies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      employee_work_experience: {
        Row: {
          created_at: string
          employee_id: string
          employer_name: string
          from_date: string | null
          id: string
          job_description: string | null
          job_title: string | null
          organization_id: string
          relevant: boolean
          source: string
          to_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_name: string
          from_date?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          organization_id: string
          relevant?: boolean
          source?: string
          to_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_name?: string
          from_date?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          organization_id?: string
          relevant?: boolean
          source?: string
          to_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_work_experience_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_experience_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employee_work_experience_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_experience_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          account_number: string | null
          account_type: string | null
          allow_multiple_entries_per_day: boolean | null
          bank_branch: string | null
          bank_name: string | null
          category: string | null
          citizenship: string | null
          company_id: string | null
          company_unit_id: string | null
          contract_type: string | null
          country: string
          created_at: string
          currency: string | null
          date_joined: string | null
          date_of_birth: string | null
          designation: string | null
          designation_id: string | null
          email: string
          employee_category: string | null
          employee_number: string
          employee_type: string
          employee_type_id: string | null
          employment_status: string | null
          engagement_type: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          max_units_per_day: number | null
          middle_name: string | null
          national_id: string | null
          nationality: string | null
          nssf_number: string | null
          number_prefix_override: string | null
          organization_id: string
          passport_number: string | null
          pay_frequency: string | null
          pay_group_id: string | null
          pay_rate: number
          pay_type: Database["public"]["Enums"]["pay_type"]
          personal_email: string | null
          phone: string | null
          probation_end_date: string | null
          probation_notes: string | null
          probation_start_date: string | null
          probation_status: string | null
          project: string | null
          project_id: string | null
          reports_to_id: string | null
          social_security_number: string | null
          status: string
          sub_department: string | null
          sub_department_id: string | null
          sub_type: string | null
          timesheet_approval_required: boolean | null
          tin: string | null
          updated_at: string
          user_id: string | null
          work_location: string | null
          work_phone: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          allow_multiple_entries_per_day?: boolean | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          citizenship?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          contract_type?: string | null
          country: string
          created_at?: string
          currency?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          designation?: string | null
          designation_id?: string | null
          email: string
          employee_category?: string | null
          employee_number: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string | null
          engagement_type?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          max_units_per_day?: number | null
          middle_name?: string | null
          national_id?: string | null
          nationality?: string | null
          nssf_number?: string | null
          number_prefix_override?: string | null
          organization_id: string
          passport_number?: string | null
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_rate: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          personal_email?: string | null
          phone?: string | null
          probation_end_date?: string | null
          probation_notes?: string | null
          probation_start_date?: string | null
          probation_status?: string | null
          project?: string | null
          project_id?: string | null
          reports_to_id?: string | null
          social_security_number?: string | null
          status?: string
          sub_department?: string | null
          sub_department_id?: string | null
          sub_type?: string | null
          timesheet_approval_required?: boolean | null
          tin?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
          work_phone?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          allow_multiple_entries_per_day?: boolean | null
          bank_branch?: string | null
          bank_name?: string | null
          category?: string | null
          citizenship?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          contract_type?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          designation?: string | null
          designation_id?: string | null
          email?: string
          employee_category?: string | null
          employee_number?: string
          employee_type?: string
          employee_type_id?: string | null
          employment_status?: string | null
          engagement_type?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          max_units_per_day?: number | null
          middle_name?: string | null
          national_id?: string | null
          nationality?: string | null
          nssf_number?: string | null
          number_prefix_override?: string | null
          organization_id?: string
          passport_number?: string | null
          pay_frequency?: string | null
          pay_group_id?: string | null
          pay_rate?: number
          pay_type?: Database["public"]["Enums"]["pay_type"]
          personal_email?: string | null
          phone?: string | null
          probation_end_date?: string | null
          probation_notes?: string | null
          probation_start_date?: string | null
          probation_status?: string | null
          project?: string | null
          project_id?: string | null
          reports_to_id?: string | null
          social_security_number?: string | null
          status?: string
          sub_department?: string | null
          sub_department_id?: string | null
          sub_type?: string | null
          timesheet_approval_required?: boolean | null
          tin?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
          work_phone?: string | null
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
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
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
            foreignKeyName: "employees_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "employees_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      engagement_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      geofences: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          organization_id: string
          radius_meters: number
          type: Database["public"]["Enums"]["geofence_type_enum"]
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          organization_id: string
          radius_meters?: number
          type?: Database["public"]["Enums"]["geofence_type_enum"]
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          organization_id?: string
          radius_meters?: number
          type?: Database["public"]["Enums"]["geofence_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          currency: string | null
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
          currency?: string | null
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
          currency?: string | null
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
          currency: string | null
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
          currency?: string | null
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
          currency?: string | null
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
          api_domain: string | null
          connected_by: string | null
          created_at: string | null
          expires_at: string
          id: string
          integration_name: string
          metadata: Json
          organization_id: string | null
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          api_domain?: string | null
          connected_by?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          integration_name: string
          metadata?: Json
          organization_id?: string | null
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          api_domain?: string | null
          connected_by?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          integration_name?: string
          metadata?: Json
          organization_id?: string | null
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      ippms_daily_timesheet_entries: {
        Row: {
          amount: number | null
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          project_id: string
          rate_snapshot: number
          rejection_reason: string | null
          status: string
          task_description: string
          units: number
          updated_at: string
          work_date: string
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          project_id: string
          rate_snapshot?: number
          rejection_reason?: string | null
          status?: string
          task_description?: string
          units?: number
          updated_at?: string
          work_date: string
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          project_id?: string
          rate_snapshot?: number
          rejection_reason?: string | null
          status?: string
          task_description?: string
          units?: number
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ippms_daily_timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ippms_daily_timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "ippms_daily_timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ippms_daily_timesheet_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ippms_daily_timesheet_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ippms_project_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          project_id: string
          task_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          task_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ippms_project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      items_catalog: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          project_id: string | null
          unit: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          project_id?: string | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          project_id?: string | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_catalog_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      nationalities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
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
      org_departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "org_departments"
            referencedColumns: ["id"]
          },
        ]
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
          org_id?: string
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
      payroll_benefits: {
        Row: {
          benefit_id: string | null
          benefit_name: string
          cost: number
          cost_type: string
          created_at: string
          created_by: string | null
          employee_id: string
          entry_type: string
          id: string
          payrun_id: string
          updated_at: string
        }
        Insert: {
          benefit_id?: string | null
          benefit_name: string
          cost?: number
          cost_type?: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          entry_type?: string
          id?: string
          payrun_id: string
          updated_at?: string
        }
        Update: {
          benefit_id?: string | null
          benefit_name?: string
          cost?: number
          cost_type?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          entry_type?: string
          id?: string
          payrun_id?: string
          updated_at?: string
        }
        Relationships: []
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
      payrun_approvals: {
        Row: {
          actioned_at: string | null
          approver_email: string
          approver_name: string
          created_at: string | null
          id: string
          payrun_id: string
          status: string
          step_order: number
          token: string
        }
        Insert: {
          actioned_at?: string | null
          approver_email: string
          approver_name: string
          created_at?: string | null
          id?: string
          payrun_id: string
          status?: string
          step_order: number
          token?: string
        }
        Update: {
          actioned_at?: string | null
          approver_email?: string
          approver_name?: string
          created_at?: string | null
          id?: string
          payrun_id?: string
          status?: string
          step_order?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrun_approvals_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_approvals_payrun_id_fkey"
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
      payrun_workflow_approvers: {
        Row: {
          approver_email: string
          approver_id: string | null
          approver_name: string
          company_id: string
          created_at: string | null
          id: string
          step_order: number
        }
        Insert: {
          approver_email: string
          approver_id?: string | null
          approver_name: string
          company_id: string
          created_at?: string | null
          id?: string
          step_order: number
        }
        Update: {
          approver_email?: string
          approver_id?: string | null
          approver_name?: string
          company_id?: string
          created_at?: string | null
          id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "payrun_workflow_approvers_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "super_admin_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_workflow_approvers_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_workflow_approvers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      probation_reminder_logs: {
        Row: {
          employee_id: string
          id: string
          organization_id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          employee_id: string
          id?: string
          organization_id: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          employee_id?: string
          id?: string
          organization_id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "probation_reminder_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "probation_reminder_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "probation_reminder_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "probation_reminder_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      reminder_rules: {
        Row: {
          created_at: string | null
          days_after: number | null
          days_before: number | null
          id: string
          is_active: boolean | null
          notification_template: string | null
          notify_roles: string[] | null
          organization_id: string
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_after?: number | null
          days_before?: number | null
          id?: string
          is_active?: boolean | null
          notification_template?: string | null
          notify_roles?: string[] | null
          organization_id: string
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_after?: number | null
          days_before?: number | null
          id?: string
          is_active?: boolean | null
          notification_template?: string | null
          notify_roles?: string[] | null
          organization_id?: string
          rule_type?: string
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
          company_id: string | null
          company_unit_id: string | null
          created_at: string | null
          data_mapping: Json | null
          direction: string
          enabled: boolean | null
          filters: Json | null
          frequency: string
          id: string
          integration_name: string
          name: string
          organization_id: string | null
          retry_attempts: number | null
          timeout: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          company_unit_id?: string | null
          created_at?: string | null
          data_mapping?: Json | null
          direction: string
          enabled?: boolean | null
          filters?: Json | null
          frequency: string
          id?: string
          integration_name: string
          name: string
          organization_id?: string | null
          retry_attempts?: number | null
          timeout?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          company_unit_id?: string | null
          created_at?: string | null
          data_mapping?: Json | null
          direction?: string
          enabled?: boolean | null
          filters?: Json | null
          frequency?: string
          id?: string
          integration_name?: string
          name?: string
          organization_id?: string | null
          retry_attempts?: number | null
          timeout?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_configurations_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          company_id: string | null
          company_unit_id: string | null
          completed_at: string | null
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          metadata: Json
          organization_id: string | null
          records_failed: number | null
          records_processed: number | null
          retry_count: number | null
          started_at: string
          status: string
          sync_id: string
          type: string
        }
        Insert: {
          company_id?: string | null
          company_unit_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          records_failed?: number | null
          records_processed?: number | null
          retry_count?: number | null
          started_at: string
          status: string
          sync_id: string
          type: string
        }
        Update: {
          company_id?: string | null
          company_unit_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          records_failed?: number | null
          records_processed?: number | null
          retry_count?: number | null
          started_at?: string
          status?: string
          sync_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_company_unit_id_fkey"
            columns: ["company_unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      time_tracking_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          employee_id: string
          end_time: string | null
          id: string
          is_billable: boolean
          is_running: boolean
          organization_id: string
          project_id: string | null
          start_time: string
          tags: string[] | null
          task_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          employee_id: string
          end_time?: string | null
          id?: string
          is_billable?: boolean
          is_running?: boolean
          organization_id: string
          project_id?: string | null
          start_time?: string
          tags?: string[] | null
          task_title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          employee_id?: string
          end_time?: string | null
          id?: string
          is_billable?: boolean
          is_running?: boolean
          organization_id?: string
          project_id?: string | null
          start_time?: string
          tags?: string[] | null
          task_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "time_tracking_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          attendance_daily_summary_id: string | null
          created_at: string
          department: string
          employee_id: string
          employee_sign: string | null
          hours_worked: number
          id: string
          is_aggregated: boolean
          linked_pay_run_id: string | null
          supervisor_comments: string | null
          supervisor_sign: string | null
          task_description: string
          time_in: string | null
          time_out: string | null
          timesheet_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          attendance_daily_summary_id?: string | null
          created_at?: string
          department: string
          employee_id: string
          employee_sign?: string | null
          hours_worked: number
          id?: string
          is_aggregated?: boolean
          linked_pay_run_id?: string | null
          supervisor_comments?: string | null
          supervisor_sign?: string | null
          task_description: string
          time_in?: string | null
          time_out?: string | null
          timesheet_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          attendance_daily_summary_id?: string | null
          created_at?: string
          department?: string
          employee_id?: string
          employee_sign?: string | null
          hours_worked?: number
          id?: string
          is_aggregated?: boolean
          linked_pay_run_id?: string | null
          supervisor_comments?: string | null
          supervisor_sign?: string | null
          task_description?: string
          time_in?: string | null
          time_out?: string | null
          timesheet_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_attendance_daily_summary_id_fkey"
            columns: ["attendance_daily_summary_id"]
            isOneToOne: false
            referencedRelation: "attendance_daily_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "timesheet_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_linked_pay_run_id_fkey"
            columns: ["linked_pay_run_id"]
            isOneToOne: false
            referencedRelation: "master_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_linked_pay_run_id_fkey"
            columns: ["linked_pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          project_id: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          project_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          project_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      user_management_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          phone: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      user_management_profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          status: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string | null
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
      variable_item_logs: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          cycle_id: string
          employee_id: string
          id: string
          item_name: string
          item_unit: string | null
          quantity: number
          remarks: string | null
          total_cost: number | null
          unit_cost: number
          updated_at: string
          work_date: string
          work_log_id: string | null
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          cycle_id: string
          employee_id: string
          id?: string
          item_name: string
          item_unit?: string | null
          quantity?: number
          remarks?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          work_date: string
          work_log_id?: string | null
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          cycle_id?: string
          employee_id?: string
          id?: string
          item_name?: string
          item_unit?: string | null
          quantity?: number
          remarks?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          work_date?: string
          work_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variable_item_logs_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "items_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_item_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "variable_pay_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_item_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_item_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "variable_item_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_item_logs_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "variable_work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_pay_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_name: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          organization_id: string
          pay_group_id: string | null
          period_end: string
          period_start: string
          project_id: string | null
          status: string
          total_allowances: number | null
          total_daily_cost: number | null
          total_net_pay: number | null
          total_piece_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_name: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          organization_id: string
          pay_group_id?: string | null
          period_end: string
          period_start: string
          project_id?: string | null
          status?: string
          total_allowances?: number | null
          total_daily_cost?: number | null
          total_net_pay?: number | null
          total_piece_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_name?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          organization_id?: string
          pay_group_id?: string | null
          period_end?: string
          period_start?: string
          project_id?: string | null
          status?: string
          total_allowances?: number | null
          total_daily_cost?: number | null
          total_net_pay?: number | null
          total_piece_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_pay_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_pay_cycles_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_pay_cycles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_pay_summaries: {
        Row: {
          allowance_airtime: number | null
          allowance_house: number | null
          allowance_medical: number | null
          allowance_seating: number | null
          allowance_travel: number | null
          created_at: string
          cycle_id: string
          days_present: number | null
          employee_id: string
          gross_pay: number | null
          id: string
          net_pay: number | null
          nssf_employee: number | null
          other_deductions: number | null
          tax_deduction: number | null
          total_daily_pay: number | null
          total_piece_pay: number | null
          updated_at: string
          validation_errors: Json | null
          work_log_validated: boolean | null
        }
        Insert: {
          allowance_airtime?: number | null
          allowance_house?: number | null
          allowance_medical?: number | null
          allowance_seating?: number | null
          allowance_travel?: number | null
          created_at?: string
          cycle_id: string
          days_present?: number | null
          employee_id: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          nssf_employee?: number | null
          other_deductions?: number | null
          tax_deduction?: number | null
          total_daily_pay?: number | null
          total_piece_pay?: number | null
          updated_at?: string
          validation_errors?: Json | null
          work_log_validated?: boolean | null
        }
        Update: {
          allowance_airtime?: number | null
          allowance_house?: number | null
          allowance_medical?: number | null
          allowance_seating?: number | null
          allowance_travel?: number | null
          created_at?: string
          cycle_id?: string
          days_present?: number | null
          employee_id?: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          nssf_employee?: number | null
          other_deductions?: number | null
          tax_deduction?: number | null
          total_daily_pay?: number | null
          total_piece_pay?: number | null
          updated_at?: string
          validation_errors?: Json | null
          work_log_validated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "variable_pay_summaries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "variable_pay_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_pay_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_pay_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "variable_pay_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_work_logs: {
        Row: {
          attendance_status: string
          created_at: string
          cycle_id: string
          daily_cost: number | null
          daily_rate: number | null
          employee_id: string
          hours_worked: number | null
          id: string
          remarks: string | null
          updated_at: string
          work_date: string
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          cycle_id: string
          daily_cost?: number | null
          daily_rate?: number | null
          employee_id: string
          hours_worked?: number | null
          id?: string
          remarks?: string | null
          updated_at?: string
          work_date: string
        }
        Update: {
          attendance_status?: string
          created_at?: string
          cycle_id?: string
          daily_cost?: number | null
          daily_rate?: number | null
          employee_id?: string
          hours_worked?: number | null
          id?: string
          remarks?: string | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_work_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "variable_pay_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_pay_groups"
            referencedColumns: ["emp_id"]
          },
          {
            foreignKeyName: "variable_work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_master: {
        Row: {
          citizenship: string | null
          company_id: string | null
          company_unit_id: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          date_joined: string | null
          designation: string | null
          email: string | null
          employee_category: string | null
          employee_number: string | null
          employee_type: string | null
          employment_status: string | null
          engagement_type: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          name: string | null
          nationality: string | null
          organization_id: string | null
          pay_group_id: string | null
          personal_email: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          work_location: string | null
          work_phone: string | null
        }
        Insert: {
          citizenship?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_joined?: string | null
          designation?: string | null
          email?: string | null
          employee_category?: string | null
          employee_number?: string | null
          employee_type?: string | null
          employment_status?: string | null
          engagement_type?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          name?: never
          nationality?: string | null
          organization_id?: never
          pay_group_id?: string | null
          personal_email?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_location?: string | null
          work_phone?: string | null
        }
        Update: {
          citizenship?: string | null
          company_id?: string | null
          company_unit_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date_joined?: string | null
          designation?: string | null
          email?: string | null
          employee_category?: string | null
          employee_number?: string | null
          employee_type?: string | null
          employment_status?: string | null
          engagement_type?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          name?: never
          nationality?: string | null
          organization_id?: never
          pay_group_id?: string | null
          personal_email?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_location?: string | null
          work_phone?: string | null
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
            foreignKeyName: "employees_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      assign_company_membership: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      can_perform_action: {
        Args: { p_action: string; p_company_id: string; p_org_id: string }
        Returns: boolean
      }
      check_is_org_admin: { Args: { user_id: string }; Returns: boolean }
      check_is_org_super_admin: { Args: { user_id: string }; Returns: boolean }
      check_is_super_admin: { Args: { user_id: string }; Returns: boolean }
      check_payrun_anomalies: { Args: { p_payrun_id: string }; Returns: Json }
      check_timesheet_anomalies: {
        Args: {
          p_employee_id: string
          p_entry_id?: string
          p_project_id: string
          p_rate: number
          p_task_description: string
          p_units: number
          p_work_date: string
        }
        Returns: Json
      }
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
      get_anomaly_counts: { Args: { p_org_id: string }; Returns: Json }
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
      user_belongs_to_org: { Args: { target_org_id: string }; Returns: boolean }
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
      attendance_mode_enum:
        | "MOBILE_GPS"
        | "QR_CODE"
        | "BIOMETRIC"
        | "SUPERVISOR"
        | "API"
        | "TIMESHEET_ONLY"
      attendance_status_enum:
        | "PRESENT"
        | "ABSENT"
        | "LATE"
        | "HALF_DAY"
        | "LEAVE"
        | "SICK"
        | "OFF"
        | "PUBLIC_HOLIDAY"
        | "REMOTE"
      benefit_type:
        | "health_insurance"
        | "retirement"
        | "dental"
        | "vision"
        | "other"
      ehs_ca_priority: "low" | "medium" | "high" | "critical"
      ehs_ca_source_type: "incident" | "hazard" | "inspection"
      ehs_ca_status: "open" | "in_progress" | "closed" | "overdue"
      ehs_compliance_status:
        | "compliant"
        | "non_compliant"
        | "partially_compliant"
        | "under_review"
      ehs_drill_status: "planned" | "completed" | "cancelled"
      ehs_drill_type:
        | "fire"
        | "evacuation"
        | "earthquake"
        | "chemical_spill"
        | "medical"
        | "other"
      ehs_environmental_severity: "minor" | "moderate" | "major" | "critical"
      ehs_environmental_type:
        | "spill"
        | "emission"
        | "waste_violation"
        | "noise"
        | "water_contamination"
        | "other"
      ehs_hazard_risk_level: "low" | "medium" | "high" | "critical"
      ehs_hazard_status:
        | "reported"
        | "assigned"
        | "mitigation_in_progress"
        | "resolved"
      ehs_incident_severity:
        | "near_miss"
        | "first_aid"
        | "medical_treatment"
        | "lost_time_injury"
        | "fatality"
      ehs_incident_status:
        | "reported"
        | "under_investigation"
        | "root_cause_identified"
        | "corrective_action"
        | "closed"
      ehs_incident_type:
        | "injury"
        | "fatality"
        | "property_damage"
        | "environmental_spill"
        | "near_miss"
        | "unsafe_condition"
        | "unsafe_act"
      ehs_inspection_result: "pass" | "fail" | "needs_attention"
      ehs_inspection_status: "scheduled" | "in_progress" | "completed"
      ehs_inspection_type: "daily" | "weekly" | "monthly" | "compliance_audit"
      ehs_observation_type: "hazard" | "safety_observation"
      ehs_permit_status:
        | "requested"
        | "approved"
        | "active"
        | "expired"
        | "cancelled"
      ehs_permit_type:
        | "hot_work"
        | "confined_space"
        | "excavation"
        | "working_at_height"
        | "electrical"
        | "other"
      ehs_ppe_condition: "new" | "good" | "fair" | "poor" | "condemned"
      ehs_ppe_status: "issued" | "returned" | "lost" | "condemned"
      ehs_risk_assessment_status: "draft" | "active" | "archived"
      ehs_risk_consequence:
        | "insignificant"
        | "minor"
        | "moderate"
        | "major"
        | "catastrophic"
      ehs_risk_likelihood:
        | "rare"
        | "unlikely"
        | "possible"
        | "likely"
        | "almost_certain"
      ehs_training_status: "valid" | "expired" | "expiring_soon"
      ehs_training_type:
        | "first_aid"
        | "fire_safety"
        | "working_at_height"
        | "equipment_operation"
        | "hazmat_handling"
        | "other"
      geofence_type_enum: "office" | "site" | "client"
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
      recorded_source_enum:
        | "ADMIN"
        | "SELF_CHECKIN"
        | "BULK_UPLOAD"
        | "SYSTEM"
        | "QR"
        | "BIOMETRIC"
        | "API"
      regularization_status_enum:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "AUTO_APPROVED"
      tracking_type_enum: "MANDATORY" | "OPTIONAL" | "EXEMPT"
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
      attendance_mode_enum: [
        "MOBILE_GPS",
        "QR_CODE",
        "BIOMETRIC",
        "SUPERVISOR",
        "API",
        "TIMESHEET_ONLY",
      ],
      attendance_status_enum: [
        "PRESENT",
        "ABSENT",
        "LATE",
        "HALF_DAY",
        "LEAVE",
        "SICK",
        "OFF",
        "PUBLIC_HOLIDAY",
        "REMOTE",
      ],
      benefit_type: [
        "health_insurance",
        "retirement",
        "dental",
        "vision",
        "other",
      ],
      ehs_ca_priority: ["low", "medium", "high", "critical"],
      ehs_ca_source_type: ["incident", "hazard", "inspection"],
      ehs_ca_status: ["open", "in_progress", "closed", "overdue"],
      ehs_compliance_status: [
        "compliant",
        "non_compliant",
        "partially_compliant",
        "under_review",
      ],
      ehs_drill_status: ["planned", "completed", "cancelled"],
      ehs_drill_type: [
        "fire",
        "evacuation",
        "earthquake",
        "chemical_spill",
        "medical",
        "other",
      ],
      ehs_environmental_severity: ["minor", "moderate", "major", "critical"],
      ehs_environmental_type: [
        "spill",
        "emission",
        "waste_violation",
        "noise",
        "water_contamination",
        "other",
      ],
      ehs_hazard_risk_level: ["low", "medium", "high", "critical"],
      ehs_hazard_status: [
        "reported",
        "assigned",
        "mitigation_in_progress",
        "resolved",
      ],
      ehs_incident_severity: [
        "near_miss",
        "first_aid",
        "medical_treatment",
        "lost_time_injury",
        "fatality",
      ],
      ehs_incident_status: [
        "reported",
        "under_investigation",
        "root_cause_identified",
        "corrective_action",
        "closed",
      ],
      ehs_incident_type: [
        "injury",
        "fatality",
        "property_damage",
        "environmental_spill",
        "near_miss",
        "unsafe_condition",
        "unsafe_act",
      ],
      ehs_inspection_result: ["pass", "fail", "needs_attention"],
      ehs_inspection_status: ["scheduled", "in_progress", "completed"],
      ehs_inspection_type: ["daily", "weekly", "monthly", "compliance_audit"],
      ehs_observation_type: ["hazard", "safety_observation"],
      ehs_permit_status: [
        "requested",
        "approved",
        "active",
        "expired",
        "cancelled",
      ],
      ehs_permit_type: [
        "hot_work",
        "confined_space",
        "excavation",
        "working_at_height",
        "electrical",
        "other",
      ],
      ehs_ppe_condition: ["new", "good", "fair", "poor", "condemned"],
      ehs_ppe_status: ["issued", "returned", "lost", "condemned"],
      ehs_risk_assessment_status: ["draft", "active", "archived"],
      ehs_risk_consequence: [
        "insignificant",
        "minor",
        "moderate",
        "major",
        "catastrophic",
      ],
      ehs_risk_likelihood: [
        "rare",
        "unlikely",
        "possible",
        "likely",
        "almost_certain",
      ],
      ehs_training_status: ["valid", "expired", "expiring_soon"],
      ehs_training_type: [
        "first_aid",
        "fire_safety",
        "working_at_height",
        "equipment_operation",
        "hazmat_handling",
        "other",
      ],
      geofence_type_enum: ["office", "site", "client"],
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
      recorded_source_enum: [
        "ADMIN",
        "SELF_CHECKIN",
        "BULK_UPLOAD",
        "SYSTEM",
        "QR",
        "BIOMETRIC",
        "API",
      ],
      regularization_status_enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "AUTO_APPROVED",
      ],
      tracking_type_enum: ["MANDATORY", "OPTIONAL", "EXEMPT"],
    },
  },
} as const
