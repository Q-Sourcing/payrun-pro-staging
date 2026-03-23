create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

drop extension if exists "pg_net";

create schema if not exists "ippms";

create schema if not exists "migrations_protect";

create extension if not exists "pg_net" with schema "public";

create type "ippms"."ippms_attendance_status" as enum ('PRESENT', 'ABSENT', 'OFF', 'LEAVE', 'UNPAID_LEAVE', 'SICK', 'PUBLIC_HOLIDAY');

create type "ippms"."ippms_leave_status" as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

create type "ippms"."ippms_piece_recorded_source" as enum ('PROJECT_ADMIN', 'UPLOAD', 'SYSTEM_AUTO');

create type "ippms"."ippms_recorded_source" as enum ('PROJECT_ADMIN', 'EMPLOYEE_SELF', 'UPLOAD', 'SYSTEM_AUTO');

create type "ippms"."ippms_work_type" as enum ('DAILY_RATE', 'PIECE_RATE', 'LEAVE', 'HOLIDAY', 'ABSENT', 'OFF');

create type "public"."pay_frequency_old" as enum ('weekly', 'bi_weekly', 'monthly', 'custom', 'Monthly');

create type "public"."pay_group_type" as enum ('local', 'expatriate', 'contractor', 'intern', 'temporary', 'Expatriate', 'Local', 'piece_rate');

drop trigger if exists "trg_apply_employee_probation_defaults" on "public"."employees";

drop trigger if exists "trg_sync_project_onboarding_from_employees" on "public"."employees";

drop trigger if exists "sync_rbac_assignments_trigger" on "public"."rbac_assignments";

drop trigger if exists "sync_rbac_grants_trigger" on "public"."rbac_grants";

drop trigger if exists "set_anomaly_logs_updated_at" on "public"."anomaly_logs";

drop trigger if exists "set_approval_groups_updated_at" on "public"."approval_groups";

drop trigger if exists "set_approval_workflow_followups_updated_at" on "public"."approval_workflow_followups";

drop trigger if exists "set_approval_workflow_messages_updated_at" on "public"."approval_workflow_messages";

drop trigger if exists "tr_workflow_version_snapshot" on "public"."approval_workflows";

drop trigger if exists "set_daily_summary_updated_at" on "public"."attendance_daily_summary";

drop trigger if exists "set_attendance_policies_updated_at" on "public"."attendance_policies";

drop trigger if exists "set_regularization_updated_at" on "public"."attendance_regularization_requests";

drop trigger if exists "set_shift_assignments_updated_at" on "public"."attendance_shift_assignments";

drop trigger if exists "set_attendance_shifts_updated_at" on "public"."attendance_shifts";

drop trigger if exists "set_attendance_time_logs_updated_at" on "public"."attendance_time_logs";

drop trigger if exists "trg_compute_daily_summary_insert" on "public"."attendance_time_logs";

drop trigger if exists "trg_compute_daily_summary_update" on "public"."attendance_time_logs";

drop trigger if exists "update_benefits_updated_at" on "public"."benefits";

drop trigger if exists "update_company_settings_updated_at" on "public"."company_settings";

drop trigger if exists "update_contract_templates_updated_at" on "public"."contract_templates";

drop trigger if exists "set_designations_updated_at" on "public"."designations";

drop trigger if exists "set_ehs_compliance_updated_at" on "public"."ehs_compliance_requirements";

drop trigger if exists "trg_ehs_corrective_actions_updated_at" on "public"."ehs_corrective_actions";

drop trigger if exists "set_ehs_drills_updated_at" on "public"."ehs_emergency_drills";

drop trigger if exists "set_ehs_env_incidents_updated_at" on "public"."ehs_environmental_incidents";

drop trigger if exists "trg_ehs_env_incident_number" on "public"."ehs_environmental_incidents";

drop trigger if exists "trg_ehs_hazard_number" on "public"."ehs_hazards";

drop trigger if exists "trg_ehs_hazards_updated_at" on "public"."ehs_hazards";

drop trigger if exists "trg_ehs_incident_number" on "public"."ehs_incidents";

drop trigger if exists "trg_ehs_incidents_updated_at" on "public"."ehs_incidents";

drop trigger if exists "trg_ehs_inspection_templates_updated_at" on "public"."ehs_inspection_templates";

drop trigger if exists "trg_ehs_inspection_number" on "public"."ehs_inspections";

drop trigger if exists "trg_ehs_inspections_updated_at" on "public"."ehs_inspections";

drop trigger if exists "set_ehs_permits_updated_at" on "public"."ehs_permits";

drop trigger if exists "trg_ehs_permit_number" on "public"."ehs_permits";

drop trigger if exists "set_ehs_ppe_records_updated_at" on "public"."ehs_ppe_records";

drop trigger if exists "set_ehs_ppe_types_updated_at" on "public"."ehs_ppe_types";

drop trigger if exists "set_ehs_risk_assessments_updated_at" on "public"."ehs_risk_assessments";

drop trigger if exists "trg_ehs_assessment_number" on "public"."ehs_risk_assessments";

drop trigger if exists "trg_ehs_training_records_updated_at" on "public"."ehs_training_records";

drop trigger if exists "update_employee_contracts_updated_at" on "public"."employee_contracts";

drop trigger if exists "update_employee_number_settings_updated_at" on "public"."employee_number_settings";

drop trigger if exists "set_employee_time_policies_updated_at" on "public"."employee_time_policies";

drop trigger if exists "trg_log_employee_number_change" on "public"."employees";

drop trigger if exists "trg_set_employee_number_before_insert" on "public"."employees";

drop trigger if exists "update_employees_updated_at" on "public"."employees";

drop trigger if exists "update_expatriate_policies_updated_at" on "public"."expatriate_policies";

drop trigger if exists "set_geofences_updated_at" on "public"."geofences";

drop trigger if exists "set_ippms_timesheet_updated_at" on "public"."ippms_daily_timesheet_entries";

drop trigger if exists "trg_items_catalog_updated_at" on "public"."items_catalog";

drop trigger if exists "set_locations_updated_at" on "public"."locations";

drop trigger if exists "set_org_departments_updated_at" on "public"."org_departments";

drop trigger if exists "update_pay_groups_updated_at" on "public"."pay_groups";

drop trigger if exists "update_pay_items_updated_at" on "public"."pay_items";

drop trigger if exists "trg_enforce_pay_run_security" on "public"."pay_runs";

drop trigger if exists "update_pay_runs_updated_at" on "public"."pay_runs";

drop trigger if exists "tr_payroll_approval_configs_updated_at" on "public"."payroll_approval_configs";

drop trigger if exists "set_payroll_benefits_updated_at" on "public"."payroll_benefits";

drop trigger if exists "update_payslip_templates_updated_at" on "public"."payslip_templates";

drop trigger if exists "update_project_onboarding_steps_updated_at" on "public"."project_onboarding_steps";

drop trigger if exists "trg_create_project_onboarding_steps" on "public"."projects";

drop trigger if exists "trg_update_project_onboarding_steps" on "public"."projects";

drop trigger if exists "trg_audit_rbac_assignments" on "public"."rbac_assignments";

drop trigger if exists "trg_validate_rbac_assignment" on "public"."rbac_assignments";

drop trigger if exists "trg_audit_rbac_grants" on "public"."rbac_grants";

drop trigger if exists "trg_audit_rbac_roles" on "public"."rbac_roles";

drop trigger if exists "update_settings_updated_at" on "public"."settings";

drop trigger if exists "set_time_tracking_updated_at" on "public"."time_tracking_entries";

drop trigger if exists "sync_timesheet_hours_after_entry" on "public"."timesheet_entries";

drop trigger if exists "update_timesheet_entries_updated_at" on "public"."timesheet_entries";

drop trigger if exists "update_timesheets_updated_at" on "public"."timesheets";

drop trigger if exists "set_user_management_profiles_updated_at" on "public"."user_management_profiles";

drop trigger if exists "update_user_preferences_updated_at" on "public"."user_preferences";

drop trigger if exists "update_users_updated_at" on "public"."users";

drop trigger if exists "trg_variable_item_logs_updated_at" on "public"."variable_item_logs";

drop trigger if exists "trg_variable_pay_cycles_updated_at" on "public"."variable_pay_cycles";

drop trigger if exists "trg_variable_pay_summaries_updated_at" on "public"."variable_pay_summaries";

drop trigger if exists "trg_variable_work_logs_updated_at" on "public"."variable_work_logs";

drop policy "activity_logs_select" on "public"."activity_logs";

drop policy "activity_logs_select_policy" on "public"."activity_logs";

drop policy "alert_logs_all" on "public"."alert_logs";

drop policy "alert_rules_all" on "public"."alert_rules";

drop policy "attendance_records_all" on "public"."attendance_records";

drop policy "audit_logs_all" on "public"."audit_logs";

drop policy "audit_logs_all_admins" on "public"."audit_logs";

drop policy "audit_logs_immutable" on "public"."audit_logs";

drop policy "audit_logs_insert_policy" on "public"."audit_logs";

drop policy "audit_logs_select_own" on "public"."audit_logs";

drop policy "audit_logs_select_policy" on "public"."audit_logs";

drop policy "auth_events_select" on "public"."auth_events";

drop policy "auth_events_select_policy" on "public"."auth_events";

drop policy "company_settings_all" on "public"."company_settings";

drop policy "employees_update_policy" on "public"."employees";

drop policy "expatriate_pay_groups_all" on "public"."expatriate_pay_groups";

drop policy "expatriate_pay_groups_delete" on "public"."expatriate_pay_groups";

drop policy "expatriate_pay_groups_insert" on "public"."expatriate_pay_groups";

drop policy "expatriate_pay_groups_select" on "public"."expatriate_pay_groups";

drop policy "expatriate_pay_groups_update" on "public"."expatriate_pay_groups";

drop policy "expatriate_pay_run_items_delete" on "public"."expatriate_pay_run_items";

drop policy "expatriate_pay_run_items_insert" on "public"."expatriate_pay_run_items";

drop policy "expatriate_pay_run_items_select" on "public"."expatriate_pay_run_items";

drop policy "expatriate_pay_run_items_update" on "public"."expatriate_pay_run_items";

drop policy "expatriate_policies_all" on "public"."expatriate_policies";

drop policy "head_office_pay_group_members_all" on "public"."head_office_pay_group_members";

drop policy "head_office_pay_group_members_select" on "public"."head_office_pay_group_members";

drop policy "integration_health_all" on "public"."integration_health";

drop policy "integration_tokens_all" on "public"."integration_tokens";

drop policy "intern_pay_groups_all" on "public"."intern_pay_groups";

drop policy "intern_pay_groups_select" on "public"."intern_pay_groups";

drop policy "notification_channels_all" on "public"."notification_channels";

drop policy "org_read" on "public"."organization_security_settings";

drop policy "org_update" on "public"."organization_security_settings";

drop policy "organizations_select" on "public"."organizations";

drop policy "pay_calculation_audit_log_insert" on "public"."pay_calculation_audit_log";

drop policy "pay_calculation_audit_log_select" on "public"."pay_calculation_audit_log";

drop policy "pay_groups_all" on "public"."pay_groups";

drop policy "pay_groups_select" on "public"."pay_groups";

drop policy "pay_runs_update_policy" on "public"."pay_runs";

drop policy "payroll_approval_categories_all" on "public"."payroll_approval_categories";

drop policy "payroll_approval_categories_select" on "public"."payroll_approval_categories";

drop policy "payroll_approval_configs_all" on "public"."payroll_approval_configs";

drop policy "payroll_approval_configs_select" on "public"."payroll_approval_configs";

drop policy "payslip_generations_insert" on "public"."payslip_generations";

drop policy "payslip_generations_select" on "public"."payslip_generations";

drop policy "payslip_templates_delete" on "public"."payslip_templates";

drop policy "payslip_templates_insert" on "public"."payslip_templates";

drop policy "payslip_templates_select" on "public"."payslip_templates";

drop policy "payslip_templates_update" on "public"."payslip_templates";

drop policy "permission_cache_all_system" on "public"."permission_cache";

drop policy "permission_cache_select_own" on "public"."permission_cache";

drop policy "devices_insert_own" on "public"."platform_admin_devices";

drop policy "devices_select_own" on "public"."platform_admin_devices";

drop policy "devices_update_own" on "public"."platform_admin_devices";

drop policy "platform_admins_select" on "public"."platform_admins";

drop policy "profiles_insert" on "public"."profiles";

drop policy "profiles_select" on "public"."profiles";

drop policy "profiles_update" on "public"."profiles";

drop policy "Allow all access to reminder_rules" on "public"."reminder_rules";

drop policy "role_assignments_all_admins" on "public"."role_assignments";

drop policy "role_assignments_select_own" on "public"."role_assignments";

drop policy "settings_delete" on "public"."settings";

drop policy "settings_insert" on "public"."settings";

drop policy "settings_select" on "public"."settings";

drop policy "settings_update" on "public"."settings";

drop policy "sub_departments_delete" on "public"."sub_departments";

drop policy "sub_departments_insert" on "public"."sub_departments";

drop policy "sub_departments_select" on "public"."sub_departments";

drop policy "sub_departments_update" on "public"."sub_departments";

drop policy "sync_configurations_all" on "public"."sync_configurations";

drop policy "sync_logs_all" on "public"."sync_logs";

drop policy "Admins can update invites (revoke)" on "public"."user_invites";

drop policy "user_invites_delete" on "public"."user_invites";

drop policy "user_invites_insert" on "public"."user_invites";

drop policy "user_invites_select" on "public"."user_invites";

drop policy "user_invites_select_inviter" on "public"."user_invites";

drop policy "user_invites_select_own_email" on "public"."user_invites";

drop policy "user_preferences_all_own" on "public"."user_preferences";

drop policy "user_profiles_select" on "public"."user_profiles";

drop policy "user_roles_all_admin" on "public"."user_roles";

drop policy "user_roles_select_admin" on "public"."user_roles";

drop policy "user_roles_select_own" on "public"."user_roles";

drop policy "user_sessions_all_admins" on "public"."user_sessions";

drop policy "user_sessions_select_own" on "public"."user_sessions";

drop policy "users_all_super_admin" on "public"."users";

drop policy "users_select_org_admin" on "public"."users";

drop policy "users_select_own" on "public"."users";

drop policy "users_select_payroll_manager" on "public"."users";

drop policy "Org admins can update anomalies" on "public"."anomaly_logs";

drop policy "Org members can view anomalies" on "public"."anomaly_logs";

drop policy "System can insert anomalies" on "public"."anomaly_logs";

drop policy "Workflow Versions Managed by Admins" on "public"."approval_workflow_versions";

drop policy "Workflow Versions Readable by Org Members" on "public"."approval_workflow_versions";

drop policy "admins_manage_daily_summary" on "public"."attendance_daily_summary";

drop policy "read_own_daily_summary" on "public"."attendance_daily_summary";

drop policy "admins_manage_devices" on "public"."attendance_devices";

drop policy "manage_own_devices" on "public"."attendance_devices";

drop policy "read_own_devices" on "public"."attendance_devices";

drop policy "admins_manage_policies" on "public"."attendance_policies";

drop policy "org_members_read_policies" on "public"."attendance_policies";

drop policy "admins_manage_regularization" on "public"."attendance_regularization_requests";

drop policy "employees_create_regularization" on "public"."attendance_regularization_requests";

drop policy "read_own_regularization" on "public"."attendance_regularization_requests";

drop policy "admins_manage_shift_assignments" on "public"."attendance_shift_assignments";

drop policy "read_shift_assignments" on "public"."attendance_shift_assignments";

drop policy "admins_manage_shifts" on "public"."attendance_shifts";

drop policy "org_members_read_shifts" on "public"."attendance_shifts";

drop policy "admins_delete_time_logs" on "public"."attendance_time_logs";

drop policy "admins_update_time_logs" on "public"."attendance_time_logs";

drop policy "employees_insert_own_time_logs" on "public"."attendance_time_logs";

drop policy "employees_read_own_time_logs" on "public"."attendance_time_logs";

drop policy "cleanup_logs_platform_admin_select" on "public"."cleanup_logs";

drop policy "companies_select_policy" on "public"."companies";

drop policy "Org admins can manage templates" on "public"."contract_templates";

drop policy "Org members can view templates" on "public"."contract_templates";

drop policy "Designations managed by admins" on "public"."designations";

drop policy "Designations readable by org members" on "public"."designations";

drop policy "org_access" on "public"."ehs_compliance_requirements";

drop policy "ehs_corrective_actions_org_access" on "public"."ehs_corrective_actions";

drop policy "org_access" on "public"."ehs_emergency_drills";

drop policy "org_access" on "public"."ehs_environmental_incidents";

drop policy "ehs_hazards_org_access" on "public"."ehs_hazards";

drop policy "ehs_incidents_org_access" on "public"."ehs_incidents";

drop policy "ehs_inspection_items_access" on "public"."ehs_inspection_items";

drop policy "ehs_inspection_templates_org_access" on "public"."ehs_inspection_templates";

drop policy "ehs_inspections_org_access" on "public"."ehs_inspections";

drop policy "org_access" on "public"."ehs_permits";

drop policy "org_access" on "public"."ehs_ppe_records";

drop policy "org_access" on "public"."ehs_ppe_types";

drop policy "org_access" on "public"."ehs_risk_assessment_items";

drop policy "org_access" on "public"."ehs_risk_assessments";

drop policy "ehs_training_records_org_access" on "public"."ehs_training_records";

drop policy "Org members can manage employee addresses" on "public"."employee_addresses";

drop policy "Org admins can manage contracts" on "public"."employee_contracts";

drop policy "Org members can view contracts" on "public"."employee_contracts";

drop policy "Org members can manage employee dependents" on "public"."employee_dependents";

drop policy "Org members can manage employee documents" on "public"."employee_documents";

drop policy "Org members can manage employee education" on "public"."employee_education";

drop policy "Org members can read employee external IDs" on "public"."employee_external_ids";

drop policy "admins_manage_employee_geofences" on "public"."employee_geofences";

drop policy "read_employee_geofences" on "public"."employee_geofences";

drop policy "admins_manage_time_policies" on "public"."employee_time_policies";

drop policy "read_own_time_policy" on "public"."employee_time_policies";

drop policy "Org members can manage employee work experience" on "public"."employee_work_experience";

drop policy "employees_select_policy" on "public"."employees";

drop policy "admins_manage_geofences" on "public"."geofences";

drop policy "org_members_read_geofences" on "public"."geofences";

drop policy "items_catalog_delete" on "public"."items_catalog";

drop policy "items_catalog_insert" on "public"."items_catalog";

drop policy "items_catalog_select" on "public"."items_catalog";

drop policy "items_catalog_update" on "public"."items_catalog";

drop policy "Users can delete locations in their org" on "public"."locations";

drop policy "Users can insert locations in their org" on "public"."locations";

drop policy "Users can update locations in their org" on "public"."locations";

drop policy "Users can view locations in their org" on "public"."locations";

drop policy "Templates managed by Org Admins" on "public"."notification_templates";

drop policy "Templates readable by Org Members" on "public"."notification_templates";

drop policy "Users can delete departments in their org" on "public"."org_departments";

drop policy "Users can insert departments in their org" on "public"."org_departments";

drop policy "Users can update departments in their org" on "public"."org_departments";

drop policy "Users can view departments in their org" on "public"."org_departments";

drop policy "organizations_select_policy" on "public"."organizations";

drop policy "pay_runs_select_policy" on "public"."pay_runs";

drop policy "Categories Managed by Admins" on "public"."payroll_approval_categories";

drop policy "Categories Readable by Org Members" on "public"."payroll_approval_categories";

drop policy "Configs Managed by Admins" on "public"."payroll_approval_configs";

drop policy "Configs Readable by Org Members" on "public"."payroll_approval_configs";

drop policy "Users can manage payroll_benefits for their org pay runs" on "public"."payroll_benefits";

drop policy "payrun_approvals_delete" on "public"."payrun_approvals";

drop policy "payrun_approvals_insert" on "public"."payrun_approvals";

drop policy "payrun_approvals_select" on "public"."payrun_approvals";

drop policy "payrun_approvals_update" on "public"."payrun_approvals";

drop policy "payrun_workflow_approvers_delete" on "public"."payrun_workflow_approvers";

drop policy "payrun_workflow_approvers_insert" on "public"."payrun_workflow_approvers";

drop policy "payrun_workflow_approvers_select" on "public"."payrun_workflow_approvers";

drop policy "payrun_workflow_approvers_update" on "public"."payrun_workflow_approvers";

drop policy "Users can view payslip generations for their templates" on "public"."payslip_generations";

drop policy "org_members_view_reminder_logs" on "public"."probation_reminder_logs";

drop policy "projects_select_policy" on "public"."projects";

drop policy "Super admins can view all rbac assignments" on "public"."rbac_assignments";

drop policy "rbac_assignments_select_policy" on "public"."rbac_assignments";

drop policy "rbac_permissions_delete" on "public"."rbac_permissions";

drop policy "rbac_permissions_insert" on "public"."rbac_permissions";

drop policy "rbac_permissions_update" on "public"."rbac_permissions";

drop policy "rbac_role_permissions_delete" on "public"."rbac_role_permissions";

drop policy "rbac_role_permissions_insert" on "public"."rbac_role_permissions";

drop policy "rbac_role_permissions_update" on "public"."rbac_role_permissions";

drop policy "rbac_roles_delete" on "public"."rbac_roles";

drop policy "rbac_roles_insert" on "public"."rbac_roles";

drop policy "rbac_roles_update" on "public"."rbac_roles";

drop policy "Org admins manage reminder rules" on "public"."reminder_rules";

drop policy "Org members can read sync configurations" on "public"."sync_configurations";

drop policy "Org members can read sync logs" on "public"."sync_logs";

drop policy "Employees manage own time entries" on "public"."time_tracking_entries";

drop policy "Org admins view all time entries" on "public"."time_tracking_entries";

drop policy "Org admins can manage departments" on "public"."timesheet_departments";

drop policy "Org members can read departments" on "public"."timesheet_departments";

drop policy "Employees can manage own entries" on "public"."timesheet_entries";

drop policy "Org admins can view all entries" on "public"."timesheet_entries";

drop policy "Employees can manage own timesheets" on "public"."timesheets";

drop policy "Org admins can update timesheets" on "public"."timesheets";

drop policy "Org admins can view all timesheets" on "public"."timesheets";

drop policy "Admins and HR can view invitations" on "public"."user_management_invitations";

drop policy "org_admins_hr_read_user_management_profiles" on "public"."user_management_profiles";

drop policy "Org Admins can view profiles in their organization" on "public"."user_profiles";

drop policy "Organization admins can view organization users" on "public"."users";

drop policy "Sub-Department managers can view sub-department users" on "public"."users";

drop policy "Super admins can view all users" on "public"."users";

drop policy "variable_item_logs_delete" on "public"."variable_item_logs";

drop policy "variable_item_logs_insert" on "public"."variable_item_logs";

drop policy "variable_item_logs_select" on "public"."variable_item_logs";

drop policy "variable_item_logs_update" on "public"."variable_item_logs";

drop policy "variable_pay_cycles_delete" on "public"."variable_pay_cycles";

drop policy "variable_pay_cycles_insert" on "public"."variable_pay_cycles";

drop policy "variable_pay_cycles_select" on "public"."variable_pay_cycles";

drop policy "variable_pay_cycles_update" on "public"."variable_pay_cycles";

drop policy "variable_pay_summaries_insert" on "public"."variable_pay_summaries";

drop policy "variable_pay_summaries_select" on "public"."variable_pay_summaries";

drop policy "variable_pay_summaries_update" on "public"."variable_pay_summaries";

drop policy "variable_work_logs_delete" on "public"."variable_work_logs";

drop policy "variable_work_logs_insert" on "public"."variable_work_logs";

drop policy "variable_work_logs_select" on "public"."variable_work_logs";

drop policy "variable_work_logs_update" on "public"."variable_work_logs";

revoke delete on table "public"."intern_pay_groups" from "anon";

revoke insert on table "public"."intern_pay_groups" from "anon";

revoke references on table "public"."intern_pay_groups" from "anon";

revoke select on table "public"."intern_pay_groups" from "anon";

revoke trigger on table "public"."intern_pay_groups" from "anon";

revoke truncate on table "public"."intern_pay_groups" from "anon";

revoke update on table "public"."intern_pay_groups" from "anon";

revoke delete on table "public"."intern_pay_groups" from "authenticated";

revoke insert on table "public"."intern_pay_groups" from "authenticated";

revoke references on table "public"."intern_pay_groups" from "authenticated";

revoke select on table "public"."intern_pay_groups" from "authenticated";

revoke trigger on table "public"."intern_pay_groups" from "authenticated";

revoke truncate on table "public"."intern_pay_groups" from "authenticated";

revoke update on table "public"."intern_pay_groups" from "authenticated";

revoke delete on table "public"."intern_pay_groups" from "service_role";

revoke insert on table "public"."intern_pay_groups" from "service_role";

revoke references on table "public"."intern_pay_groups" from "service_role";

revoke select on table "public"."intern_pay_groups" from "service_role";

revoke trigger on table "public"."intern_pay_groups" from "service_role";

revoke truncate on table "public"."intern_pay_groups" from "service_role";

revoke update on table "public"."intern_pay_groups" from "service_role";

revoke delete on table "public"."user_activities" from "anon";

revoke insert on table "public"."user_activities" from "anon";

revoke references on table "public"."user_activities" from "anon";

revoke select on table "public"."user_activities" from "anon";

revoke trigger on table "public"."user_activities" from "anon";

revoke truncate on table "public"."user_activities" from "anon";

revoke update on table "public"."user_activities" from "anon";

revoke delete on table "public"."user_activities" from "authenticated";

revoke insert on table "public"."user_activities" from "authenticated";

revoke references on table "public"."user_activities" from "authenticated";

revoke select on table "public"."user_activities" from "authenticated";

revoke trigger on table "public"."user_activities" from "authenticated";

revoke truncate on table "public"."user_activities" from "authenticated";

revoke update on table "public"."user_activities" from "authenticated";

revoke delete on table "public"."user_activities" from "service_role";

revoke insert on table "public"."user_activities" from "service_role";

revoke references on table "public"."user_activities" from "service_role";

revoke select on table "public"."user_activities" from "service_role";

revoke trigger on table "public"."user_activities" from "service_role";

revoke truncate on table "public"."user_activities" from "service_role";

revoke update on table "public"."user_activities" from "service_role";

revoke delete on table "public"."user_invitations" from "anon";

revoke insert on table "public"."user_invitations" from "anon";

revoke references on table "public"."user_invitations" from "anon";

revoke select on table "public"."user_invitations" from "anon";

revoke trigger on table "public"."user_invitations" from "anon";

revoke truncate on table "public"."user_invitations" from "anon";

revoke update on table "public"."user_invitations" from "anon";

revoke delete on table "public"."user_invitations" from "authenticated";

revoke insert on table "public"."user_invitations" from "authenticated";

revoke references on table "public"."user_invitations" from "authenticated";

revoke select on table "public"."user_invitations" from "authenticated";

revoke trigger on table "public"."user_invitations" from "authenticated";

revoke truncate on table "public"."user_invitations" from "authenticated";

revoke update on table "public"."user_invitations" from "authenticated";

revoke delete on table "public"."user_invitations" from "service_role";

revoke insert on table "public"."user_invitations" from "service_role";

revoke references on table "public"."user_invitations" from "service_role";

revoke select on table "public"."user_invitations" from "service_role";

revoke trigger on table "public"."user_invitations" from "service_role";

revoke truncate on table "public"."user_invitations" from "service_role";

revoke update on table "public"."user_invitations" from "service_role";

revoke delete on table "public"."user_management_actions" from "anon";

revoke insert on table "public"."user_management_actions" from "anon";

revoke references on table "public"."user_management_actions" from "anon";

revoke select on table "public"."user_management_actions" from "anon";

revoke trigger on table "public"."user_management_actions" from "anon";

revoke truncate on table "public"."user_management_actions" from "anon";

revoke update on table "public"."user_management_actions" from "anon";

revoke delete on table "public"."user_management_actions" from "authenticated";

revoke insert on table "public"."user_management_actions" from "authenticated";

revoke references on table "public"."user_management_actions" from "authenticated";

revoke select on table "public"."user_management_actions" from "authenticated";

revoke trigger on table "public"."user_management_actions" from "authenticated";

revoke truncate on table "public"."user_management_actions" from "authenticated";

revoke update on table "public"."user_management_actions" from "authenticated";

revoke delete on table "public"."user_management_actions" from "service_role";

revoke insert on table "public"."user_management_actions" from "service_role";

revoke references on table "public"."user_management_actions" from "service_role";

revoke select on table "public"."user_management_actions" from "service_role";

revoke trigger on table "public"."user_management_actions" from "service_role";

revoke truncate on table "public"."user_management_actions" from "service_role";

revoke update on table "public"."user_management_actions" from "service_role";

alter table "public"."employees" drop constraint "employee_type_check";

alter table "public"."employees" drop constraint "employees_probation_status_check";

alter table "public"."pay_groups" drop constraint "check_pay_groups_type";

alter table "public"."payroll_approval_categories" drop constraint "payroll_approval_categories_category_id_fkey";

alter table "public"."payroll_approval_categories" drop constraint "payroll_approval_categories_category_id_key";

alter table "public"."payroll_approval_configs" drop constraint "payroll_approval_configs_organization_id_fkey";

alter table "public"."projects" drop constraint "projects_responsible_manager_id_fkey";

alter table "public"."rbac_grants" drop constraint "rbac_grants_created_by_fkey";

alter table "public"."rbac_grants" drop constraint "rbac_grants_target_check";

alter table "public"."reminder_rules" drop constraint "reminder_rules_days_before_check";

alter table "public"."reminder_rules" drop constraint "reminder_rules_organization_id_fkey";

alter table "public"."reminder_rules" drop constraint "reminder_rules_organization_id_rule_type_days_before_key";

alter table "public"."reminder_rules" drop constraint "reminder_rules_rule_type_check_v2";

alter table "public"."user_invitations" drop constraint "user_invitations_email_key";

alter table "public"."user_invitations" drop constraint "user_invitations_role_check";

alter table "public"."user_invitations" drop constraint "user_invitations_status_check";

alter table "public"."user_invitations" drop constraint "user_invitations_token_key";

alter table "public"."user_management_actions" drop constraint "user_management_actions_action_type_check";

alter table "public"."user_profiles" drop constraint "check_failed_attempts_non_negative";

alter table "public"."user_profiles" drop constraint "user_profiles_locked_by_fkey";

alter table "public"."user_profiles" drop constraint "user_profiles_unlocked_by_fkey";

alter table "public"."alert_logs" drop constraint "alert_logs_rule_id_fkey";

alter table "public"."anomaly_logs" drop constraint "anomaly_logs_organization_id_fkey";

alter table "public"."anomaly_logs" drop constraint "anomaly_logs_project_id_fkey";

alter table "public"."approval_group_members" drop constraint "approval_group_members_group_id_fkey";

alter table "public"."approval_groups" drop constraint "approval_groups_organization_id_fkey";

alter table "public"."approval_workflow_criteria" drop constraint "approval_workflow_criteria_workflow_id_fkey";

alter table "public"."approval_workflow_followups" drop constraint "approval_workflow_followups_workflow_id_fkey";

alter table "public"."approval_workflow_messages" drop constraint "approval_workflow_messages_workflow_id_fkey";

alter table "public"."approval_workflow_versions" drop constraint "approval_workflow_versions_workflow_id_fkey";

alter table "public"."attendance_daily_summary" drop constraint "attendance_daily_summary_employee_id_fkey";

alter table "public"."attendance_daily_summary" drop constraint "attendance_daily_summary_organization_id_fkey";

alter table "public"."attendance_daily_summary" drop constraint "attendance_daily_summary_project_id_fkey";

alter table "public"."attendance_daily_summary" drop constraint "attendance_daily_summary_shift_id_fkey";

alter table "public"."attendance_devices" drop constraint "attendance_devices_employee_id_fkey";

alter table "public"."attendance_policies" drop constraint "attendance_policies_company_id_fkey";

alter table "public"."attendance_policies" drop constraint "attendance_policies_organization_id_fkey";

alter table "public"."attendance_records" drop constraint "attendance_records_employee_id_fkey";

alter table "public"."attendance_regularization_requests" drop constraint "attendance_regularization_requests_employee_id_fkey";

alter table "public"."attendance_regularization_requests" drop constraint "attendance_regularization_requests_organization_id_fkey";

alter table "public"."attendance_shift_assignments" drop constraint "attendance_shift_assignments_employee_id_fkey";

alter table "public"."attendance_shift_assignments" drop constraint "attendance_shift_assignments_shift_id_fkey";

alter table "public"."attendance_shifts" drop constraint "attendance_shifts_organization_id_fkey";

alter table "public"."attendance_time_logs" drop constraint "attendance_time_logs_employee_id_fkey";

alter table "public"."attendance_time_logs" drop constraint "attendance_time_logs_geofence_id_fkey";

alter table "public"."attendance_time_logs" drop constraint "attendance_time_logs_organization_id_fkey";

alter table "public"."attendance_time_logs" drop constraint "attendance_time_logs_project_id_fkey";

alter table "public"."auth_events" drop constraint "auth_events_org_id_fkey";

alter table "public"."designations" drop constraint "designations_organization_id_fkey";

alter table "public"."ehs_compliance_requirements" drop constraint "ehs_compliance_requirements_organization_id_fkey";

alter table "public"."ehs_compliance_requirements" drop constraint "ehs_compliance_requirements_responsible_person_fkey";

alter table "public"."ehs_corrective_actions" drop constraint "ehs_corrective_actions_assigned_to_fkey";

alter table "public"."ehs_corrective_actions" drop constraint "ehs_corrective_actions_organization_id_fkey";

alter table "public"."ehs_corrective_actions" drop constraint "ehs_corrective_actions_project_id_fkey";

alter table "public"."ehs_corrective_actions" drop constraint "ehs_corrective_actions_responsible_person_fkey";

alter table "public"."ehs_emergency_drills" drop constraint "ehs_emergency_drills_conducted_by_fkey";

alter table "public"."ehs_emergency_drills" drop constraint "ehs_emergency_drills_organization_id_fkey";

alter table "public"."ehs_emergency_drills" drop constraint "ehs_emergency_drills_project_id_fkey";

alter table "public"."ehs_environmental_incidents" drop constraint "ehs_environmental_incidents_organization_id_fkey";

alter table "public"."ehs_environmental_incidents" drop constraint "ehs_environmental_incidents_project_id_fkey";

alter table "public"."ehs_environmental_incidents" drop constraint "ehs_environmental_incidents_reported_by_fkey";

alter table "public"."ehs_hazards" drop constraint "ehs_hazards_assigned_to_fkey";

alter table "public"."ehs_hazards" drop constraint "ehs_hazards_company_id_fkey";

alter table "public"."ehs_hazards" drop constraint "ehs_hazards_organization_id_fkey";

alter table "public"."ehs_hazards" drop constraint "ehs_hazards_project_id_fkey";

alter table "public"."ehs_hazards" drop constraint "ehs_hazards_reported_by_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_company_id_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_investigator_id_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_organization_id_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_project_id_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_reported_by_fkey";

alter table "public"."ehs_incidents" drop constraint "ehs_incidents_supervisor_id_fkey";

alter table "public"."ehs_inspection_items" drop constraint "ehs_inspection_items_auto_hazard_id_fkey";

alter table "public"."ehs_inspection_items" drop constraint "ehs_inspection_items_inspection_id_fkey";

alter table "public"."ehs_inspection_templates" drop constraint "ehs_inspection_templates_organization_id_fkey";

alter table "public"."ehs_inspections" drop constraint "ehs_inspections_company_id_fkey";

alter table "public"."ehs_inspections" drop constraint "ehs_inspections_inspector_id_fkey";

alter table "public"."ehs_inspections" drop constraint "ehs_inspections_organization_id_fkey";

alter table "public"."ehs_inspections" drop constraint "ehs_inspections_project_id_fkey";

alter table "public"."ehs_inspections" drop constraint "ehs_inspections_template_id_fkey";

alter table "public"."ehs_permits" drop constraint "ehs_permits_approved_by_fkey";

alter table "public"."ehs_permits" drop constraint "ehs_permits_organization_id_fkey";

alter table "public"."ehs_permits" drop constraint "ehs_permits_project_id_fkey";

alter table "public"."ehs_permits" drop constraint "ehs_permits_requested_by_fkey";

alter table "public"."ehs_ppe_records" drop constraint "ehs_ppe_records_employee_id_fkey";

alter table "public"."ehs_ppe_records" drop constraint "ehs_ppe_records_organization_id_fkey";

alter table "public"."ehs_ppe_records" drop constraint "ehs_ppe_records_ppe_type_id_fkey";

alter table "public"."ehs_ppe_records" drop constraint "ehs_ppe_records_project_id_fkey";

alter table "public"."ehs_ppe_types" drop constraint "ehs_ppe_types_organization_id_fkey";

alter table "public"."ehs_risk_assessment_items" drop constraint "ehs_risk_assessment_items_assessment_id_fkey";

alter table "public"."ehs_risk_assessment_items" drop constraint "ehs_risk_assessment_items_responsible_person_fkey";

alter table "public"."ehs_risk_assessments" drop constraint "ehs_risk_assessments_approved_by_fkey";

alter table "public"."ehs_risk_assessments" drop constraint "ehs_risk_assessments_assessed_by_fkey";

alter table "public"."ehs_risk_assessments" drop constraint "ehs_risk_assessments_company_id_fkey";

alter table "public"."ehs_risk_assessments" drop constraint "ehs_risk_assessments_organization_id_fkey";

alter table "public"."ehs_risk_assessments" drop constraint "ehs_risk_assessments_project_id_fkey";

alter table "public"."ehs_training_records" drop constraint "ehs_training_records_employee_id_fkey";

alter table "public"."ehs_training_records" drop constraint "ehs_training_records_organization_id_fkey";

alter table "public"."ehs_training_records" drop constraint "ehs_training_records_project_id_fkey";

alter table "public"."employee_addresses" drop constraint "employee_addresses_employee_id_fkey";

alter table "public"."employee_addresses" drop constraint "employee_addresses_organization_id_fkey";

alter table "public"."employee_dependents" drop constraint "employee_dependents_employee_id_fkey";

alter table "public"."employee_dependents" drop constraint "employee_dependents_organization_id_fkey";

alter table "public"."employee_documents" drop constraint "employee_documents_employee_id_fkey";

alter table "public"."employee_documents" drop constraint "employee_documents_organization_id_fkey";

alter table "public"."employee_education" drop constraint "employee_education_employee_id_fkey";

alter table "public"."employee_education" drop constraint "employee_education_organization_id_fkey";

alter table "public"."employee_external_ids" drop constraint "employee_external_ids_employee_id_fkey";

alter table "public"."employee_external_ids" drop constraint "employee_external_ids_organization_id_fkey";

alter table "public"."employee_geofences" drop constraint "employee_geofences_employee_id_fkey";

alter table "public"."employee_geofences" drop constraint "employee_geofences_geofence_id_fkey";

alter table "public"."employee_number_history" drop constraint "employee_number_history_employee_id_fkey";

alter table "public"."employee_time_policies" drop constraint "employee_time_policies_employee_id_fkey";

alter table "public"."employee_work_experience" drop constraint "employee_work_experience_employee_id_fkey";

alter table "public"."employee_work_experience" drop constraint "employee_work_experience_organization_id_fkey";

alter table "public"."employees" drop constraint "employees_designation_id_fkey";

alter table "public"."employees" drop constraint "employees_pay_group_id_fkey";

alter table "public"."employees" drop constraint "employees_reports_to_id_fkey";

alter table "public"."expatriate_pay_run_items" drop constraint "expatriate_pay_run_items_employee_id_fkey";

alter table "public"."expatriate_pay_run_items" drop constraint "expatriate_pay_run_items_expatriate_pay_group_id_fkey";

alter table "public"."expatriate_pay_run_items" drop constraint "expatriate_pay_run_items_pay_run_id_fkey";

alter table "public"."geofences" drop constraint "geofences_organization_id_fkey";

alter table "public"."integration_tokens" drop constraint "integration_tokens_organization_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" drop constraint "ippms_daily_timesheet_entries_employee_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" drop constraint "ippms_daily_timesheet_entries_organization_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" drop constraint "ippms_daily_timesheet_entries_project_id_fkey";

alter table "public"."ippms_project_tasks" drop constraint "ippms_project_tasks_project_id_fkey";

alter table "public"."locations" drop constraint "locations_organization_id_fkey";

alter table "public"."lst_employee_assignments" drop constraint "lst_employee_assignments_employee_id_fkey";

alter table "public"."lst_employee_assignments" drop constraint "lst_employee_assignments_plan_id_fkey";

alter table "public"."org_departments" drop constraint "org_departments_organization_id_fkey";

alter table "public"."org_departments" drop constraint "org_departments_parent_department_id_fkey";

alter table "public"."organization_security_settings" drop constraint "organization_security_settings_org_id_fkey";

alter table "public"."pay_calculation_audit_log" drop constraint "pay_calculation_audit_log_employee_id_fkey";

alter table "public"."pay_calculation_audit_log" drop constraint "pay_calculation_audit_log_pay_run_id_fkey";

alter table "public"."pay_group_master" drop constraint "pay_group_master_organization_id_fkey";

alter table "public"."pay_item_custom_deductions" drop constraint "pay_item_custom_deductions_pay_item_id_fkey";

alter table "public"."pay_items" drop constraint "pay_items_employee_id_fkey";

alter table "public"."pay_items" drop constraint "pay_items_pay_run_id_fkey";

alter table "public"."pay_runs" drop constraint "pay_runs_pay_group_master_id_fkey";

alter table "public"."payroll_approval_categories" drop constraint "payroll_approval_categories_config_id_fkey";

alter table "public"."payroll_approval_configs" drop constraint "payroll_approval_configs_workflow_id_fkey";

alter table "public"."payrun_approval_steps" drop constraint "payrun_approval_steps_actioned_by_fkey";

alter table "public"."payrun_approval_steps" drop constraint "payrun_approval_steps_approver_user_id_fkey";

alter table "public"."payrun_approval_steps" drop constraint "payrun_approval_steps_delegated_by_fkey";

alter table "public"."payrun_approval_steps" drop constraint "payrun_approval_steps_original_approver_id_fkey";

alter table "public"."payrun_approval_steps" drop constraint "payrun_approval_steps_payrun_id_fkey";

alter table "public"."payrun_approvals" drop constraint "payrun_approvals_payrun_id_fkey";

alter table "public"."payrun_workflow_approvers" drop constraint "payrun_workflow_approvers_approver_id_fkey";

alter table "public"."payrun_workflow_approvers" drop constraint "payrun_workflow_approvers_company_id_fkey";

alter table "public"."payslip_generations" drop constraint "payslip_generations_employee_id_fkey";

alter table "public"."payslip_generations" drop constraint "payslip_generations_pay_run_id_fkey";

alter table "public"."payslip_generations" drop constraint "payslip_generations_template_id_fkey";

alter table "public"."permission_cache" drop constraint "permission_cache_user_id_fkey";

alter table "public"."platform_admins" drop constraint "platform_admins_auth_user_id_fkey";

alter table "public"."rbac_assignments" drop constraint "rbac_assignments_org_id_fkey";

alter table "public"."rbac_assignments" drop constraint "rbac_assignments_role_fkey";

alter table "public"."rbac_grants" drop constraint "rbac_grants_permission_key_fkey";

alter table "public"."rbac_role_permissions" drop constraint "rbac_role_permissions_org_id_fkey";

alter table "public"."rbac_role_permissions" drop constraint "rbac_role_permissions_permission_key_fkey";

alter table "public"."rbac_role_permissions" drop constraint "rbac_role_permissions_role_fkey";

alter table "public"."rbac_roles" drop constraint "rbac_roles_org_id_fkey";

alter table "public"."role_assignments" drop constraint "role_assignments_assigned_by_fkey";

alter table "public"."role_assignments" drop constraint "role_assignments_user_id_fkey";

alter table "public"."security_audit_logs" drop constraint "security_audit_logs_org_id_fkey";

alter table "public"."sync_configurations" drop constraint "sync_configurations_company_id_fkey";

alter table "public"."sync_configurations" drop constraint "sync_configurations_company_unit_id_fkey";

alter table "public"."sync_configurations" drop constraint "sync_configurations_organization_id_fkey";

alter table "public"."sync_logs" drop constraint "sync_logs_company_id_fkey";

alter table "public"."sync_logs" drop constraint "sync_logs_company_unit_id_fkey";

alter table "public"."sync_logs" drop constraint "sync_logs_organization_id_fkey";

alter table "public"."time_tracking_entries" drop constraint "time_tracking_entries_employee_id_fkey";

alter table "public"."time_tracking_entries" drop constraint "time_tracking_entries_organization_id_fkey";

alter table "public"."time_tracking_entries" drop constraint "time_tracking_entries_project_id_fkey";

alter table "public"."timesheet_entries" drop constraint "timesheet_entries_attendance_daily_summary_id_fkey";

alter table "public"."user_preferences" drop constraint "user_preferences_user_id_fkey";

alter table "public"."user_sessions" drop constraint "user_sessions_user_id_fkey";

alter table "public"."users" drop constraint "users_created_by_fkey";

alter table "public"."users" drop constraint "users_manager_id_fkey";

alter table "public"."users" drop constraint "users_organization_id_fkey";

drop function if exists "public"."accept_user_invitation"(p_token character varying, p_password_hash text);

drop function if exists "public"."apply_employee_probation_defaults"();

drop function if exists "public"."cleanup_expired_invitations"();

drop function if exists "public"."create_user_invitation"(p_email character varying, p_first_name character varying, p_last_name character varying, p_role character varying, p_invited_by uuid, p_organization_id uuid, p_department_id character varying, p_manager_id uuid, p_permissions jsonb);

drop function if exists "public"."ensure_timesheet_employee_for_current_user"();

drop function if exists "public"."generate_invitation_token"();

drop function if exists "public"."has_permission"(p_permission_key text, p_scope_type text, p_scope_id uuid);

drop function if exists "public"."has_permission"(user_id uuid, permission_name character varying);

drop function if exists "public"."has_role"(_user_id uuid, _role app_role);

drop function if exists "public"."is_account_locked"(_user_id uuid);

drop function if exists "public"."is_org_admin"(org_id uuid);

-- Skipping drop of is_platform_admin() — still used by policies in this migration.

drop function if exists "public"."log_user_activity"(p_user_id uuid, p_action character varying, p_resource character varying, p_details jsonb, p_ip_address inet, p_user_agent text);

drop function if exists "public"."log_user_management_action"(p_performed_by uuid, p_target_user_id uuid, p_action_type character varying, p_details jsonb, p_previous_values jsonb, p_ip_address inet, p_user_agent text);

drop function if exists "public"."refresh_project_employees_onboarding_step"(p_project_id uuid);

drop function if exists "public"."sync_project_onboarding_from_employees"();

drop function if exists "public"."sync_rbac_grants_to_auth_metadata"();

drop function if exists "public"."sync_rbac_to_auth_metadata_by_id"(p_user_id uuid);

drop view if exists "public"."employee_master";

drop view if exists "public"."super_admin_dashboard";

alter table "public"."intern_pay_groups" drop constraint "intern_pay_groups_pkey";

alter table "public"."sub_departments" drop constraint "sub_departments_pkey";

alter table "public"."user_activities" drop constraint "user_activities_pkey";

alter table "public"."user_invitations" drop constraint "user_invitations_pkey";

alter table "public"."user_management_actions" drop constraint "user_management_actions_pkey";

alter table "public"."payroll_approval_categories" drop constraint "payroll_approval_categories_pkey";

drop index if exists "public"."idx_employees_probation_status";

drop index if exists "public"."idx_projects_country";

drop index if exists "public"."idx_projects_currency";

drop index if exists "public"."idx_projects_responsible_manager_id";

drop index if exists "public"."idx_user_activities_action";

drop index if exists "public"."idx_user_activities_performed_at";

drop index if exists "public"."idx_user_activities_resource";

drop index if exists "public"."idx_user_activities_user";

drop index if exists "public"."idx_user_invitations_email";

drop index if exists "public"."idx_user_invitations_expires_at";

drop index if exists "public"."idx_user_invitations_invited_by";

drop index if exists "public"."idx_user_invitations_status";

drop index if exists "public"."idx_user_invitations_token";

drop index if exists "public"."idx_user_invites_email";

drop index if exists "public"."idx_user_invites_inviter";

drop index if exists "public"."idx_user_invites_status";

drop index if exists "public"."idx_user_management_actions_performed_at";

drop index if exists "public"."idx_user_management_actions_performed_by";

drop index if exists "public"."idx_user_management_actions_target_user";

drop index if exists "public"."idx_user_management_actions_type";

drop index if exists "public"."idx_user_profiles_failed_attempts";

drop index if exists "public"."idx_user_profiles_locked_at";

drop index if exists "public"."intern_pay_groups_pkey";

drop index if exists "public"."payroll_approval_categories_category_id_key";

drop index if exists "public"."reminder_rules_organization_id_rule_type_days_before_key";

drop index if exists "public"."sub_departments_pkey";

drop index if exists "public"."user_activities_pkey";

drop index if exists "public"."user_invitations_email_key";

drop index if exists "public"."user_invitations_pkey";

drop index if exists "public"."user_invitations_token_key";

drop index if exists "public"."user_management_actions_pkey";

drop index if exists "public"."idx_employees_probation_end_date";

drop index if exists "public"."idx_employees_sub_department";

drop index if exists "public"."idx_reminder_rules_org_type";

drop index if exists "public"."payroll_approval_categories_pkey";

drop table "public"."intern_pay_groups";

drop table "public"."user_activities";

drop table "public"."user_invitations";

drop table "public"."user_management_actions";

alter type "public"."pay_frequency" rename to "pay_frequency__old_version_to_be_dropped";

create type "public"."pay_frequency" as enum ('weekly', 'biweekly', 'monthly', 'daily_rate');

alter type "public"."payrunstatus" rename to "payrunstatus__old_version_to_be_dropped";

create type "public"."payrunstatus" as enum ('draft', 'pending_approval', 'approved', 'rejected', 'locked', 'processed');


  create table "ippms"."ippms_attendance_records" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "attendance_date" date not null,
    "status" ippms.ippms_attendance_status not null,
    "shift_id" uuid,
    "hours_worked" numeric(6,2),
    "overtime_hours" numeric(6,2),
    "remarks" text,
    "daily_rate_snapshot" numeric(12,2),
    "recorded_by" uuid,
    "recorded_source" ippms.ippms_recorded_source default 'PROJECT_ADMIN'::ippms.ippms_recorded_source,
    "payrun_id" uuid,
    "is_locked" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_attendance_records" enable row level security;


  create table "ippms"."ippms_employee_shifts" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "shift_id" uuid not null,
    "start_date" date not null,
    "end_date" date,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_employee_shifts" enable row level security;


  create table "ippms"."ippms_holidays" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "holiday_date" date not null,
    "country" text,
    "project_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_holidays" enable row level security;


  create table "ippms"."ippms_leave_requests" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "leave_type_id" uuid not null,
    "start_date" date not null,
    "end_date" date not null,
    "reason" text,
    "status" ippms.ippms_leave_status default 'PENDING'::ippms.ippms_leave_status,
    "approved_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_leave_requests" enable row level security;


  create table "ippms"."ippms_leave_types" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "code" text not null,
    "paid" boolean default false,
    "requires_approval" boolean default true,
    "max_days_per_year" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_leave_types" enable row level security;


  create table "ippms"."ippms_piece_work_catalogue" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "code" text not null,
    "unit_name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_piece_work_catalogue" enable row level security;


  create table "ippms"."ippms_piece_work_entries" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "work_date" date not null,
    "piece_id" uuid not null,
    "quantity" numeric(14,2) not null,
    "rate_snapshot" numeric(12,2),
    "recorded_by" uuid,
    "recorded_source" ippms.ippms_piece_recorded_source default 'PROJECT_ADMIN'::ippms.ippms_piece_recorded_source,
    "payrun_id" uuid,
    "is_locked" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_piece_work_entries" enable row level security;


  create table "ippms"."ippms_piece_work_rates" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "piece_id" uuid not null,
    "rate" numeric(12,2) not null,
    "start_date" date not null,
    "end_date" date,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_piece_work_rates" enable row level security;


  create table "ippms"."ippms_shifts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "break_minutes" integer default 0,
    "is_default" boolean default false,
    "project_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_shifts" enable row level security;


  create table "ippms"."ippms_work_days" (
    "id" uuid not null default gen_random_uuid(),
    "employee_id" uuid not null,
    "project_id" uuid not null,
    "work_date" date not null,
    "work_type" ippms.ippms_work_type not null,
    "attendance_id" uuid,
    "piece_entry_id" uuid,
    "payrun_id" uuid,
    "is_locked" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "ippms"."ippms_work_days" enable row level security;

-- Migrate columns off old enum types before dropping them
alter table "public"."pay_groups" alter column "pay_frequency" drop default;
alter table "public"."pay_groups" alter column "pay_frequency" set data type text using "pay_frequency"::text;

drop type "public"."pay_frequency__old_version_to_be_dropped";

drop type "public"."payrunstatus__old_version_to_be_dropped";

alter table "public"."access_grants" enable row level security;

alter table "public"."approval_workflow_steps" enable row level security;

alter table "public"."approval_workflows" enable row level security;

alter table "public"."attendance_daily_summary" alter column "status" set default 'ABSENT'::public.attendance_status_enum;

alter table "public"."attendance_daily_summary" alter column "status" set data type public.attendance_status_enum using "status"::text::public.attendance_status_enum;

alter table "public"."attendance_regularization_requests" alter column "status" set default 'PENDING'::public.regularization_status_enum;

alter table "public"."attendance_regularization_requests" alter column "status" set data type public.regularization_status_enum using "status"::text::public.regularization_status_enum;

alter table "public"."attendance_time_logs" alter column "attendance_mode" set default 'MOBILE_GPS'::public.attendance_mode_enum;

alter table "public"."attendance_time_logs" alter column "attendance_mode" set data type public.attendance_mode_enum using "attendance_mode"::text::public.attendance_mode_enum;

alter table "public"."attendance_time_logs" alter column "recorded_source" set default 'SELF_CHECKIN'::public.recorded_source_enum;

alter table "public"."attendance_time_logs" alter column "recorded_source" set data type public.recorded_source_enum using "recorded_source"::text::public.recorded_source_enum;

alter table "public"."audit_logs" drop column "organization_id";

alter table "public"."banks" enable row level security;

alter table "public"."benefits" alter column "benefit_type" set default 'other'::public.benefit_type;

alter table "public"."benefits" alter column "benefit_type" set data type public.benefit_type using "benefit_type"::text::public.benefit_type;

alter table "public"."companies" drop column "country";

alter table "public"."companies" drop column "is_active";

alter table "public"."company_unit_categories" enable row level security;

alter table "public"."company_units" enable row level security;

alter table "public"."contractor_pay_run_items" enable row level security;

alter table "public"."countries" enable row level security;

alter table "public"."database_health_log" enable row level security;

alter table "public"."ehs_compliance_requirements" alter column "compliance_status" set default 'under_review'::public.ehs_compliance_status;

alter table "public"."ehs_compliance_requirements" alter column "compliance_status" set data type public.ehs_compliance_status using "compliance_status"::text::public.ehs_compliance_status;

alter table "public"."ehs_corrective_actions" alter column "priority" set default 'medium'::public.ehs_ca_priority;

alter table "public"."ehs_corrective_actions" alter column "priority" set data type public.ehs_ca_priority using "priority"::text::public.ehs_ca_priority;

alter table "public"."ehs_corrective_actions" alter column "source_type" set data type public.ehs_ca_source_type using "source_type"::text::public.ehs_ca_source_type;

alter table "public"."ehs_corrective_actions" alter column "status" set default 'open'::public.ehs_ca_status;

alter table "public"."ehs_corrective_actions" alter column "status" set data type public.ehs_ca_status using "status"::text::public.ehs_ca_status;

alter table "public"."ehs_emergency_drills" alter column "drill_type" set default 'fire'::public.ehs_drill_type;

alter table "public"."ehs_emergency_drills" alter column "drill_type" set data type public.ehs_drill_type using "drill_type"::text::public.ehs_drill_type;

alter table "public"."ehs_emergency_drills" alter column "status" set default 'planned'::public.ehs_drill_status;

alter table "public"."ehs_emergency_drills" alter column "status" set data type public.ehs_drill_status using "status"::text::public.ehs_drill_status;

alter table "public"."ehs_environmental_incidents" alter column "severity" set default 'minor'::public.ehs_environmental_severity;

alter table "public"."ehs_environmental_incidents" alter column "severity" set data type public.ehs_environmental_severity using "severity"::text::public.ehs_environmental_severity;

alter table "public"."ehs_environmental_incidents" alter column "type" set default 'other'::public.ehs_environmental_type;

alter table "public"."ehs_environmental_incidents" alter column "type" set data type public.ehs_environmental_type using "type"::text::public.ehs_environmental_type;

alter table "public"."ehs_hazards" alter column "observation_type" set default 'hazard'::public.ehs_observation_type;

alter table "public"."ehs_hazards" alter column "observation_type" set data type public.ehs_observation_type using "observation_type"::text::public.ehs_observation_type;

alter table "public"."ehs_hazards" alter column "risk_level" set default 'medium'::public.ehs_hazard_risk_level;

alter table "public"."ehs_hazards" alter column "risk_level" set data type public.ehs_hazard_risk_level using "risk_level"::text::public.ehs_hazard_risk_level;

alter table "public"."ehs_hazards" alter column "status" set default 'reported'::public.ehs_hazard_status;

alter table "public"."ehs_hazards" alter column "status" set data type public.ehs_hazard_status using "status"::text::public.ehs_hazard_status;

alter table "public"."ehs_incidents" alter column "incident_type" set default 'near_miss'::public.ehs_incident_type;

alter table "public"."ehs_incidents" alter column "incident_type" set data type public.ehs_incident_type using "incident_type"::text::public.ehs_incident_type;

alter table "public"."ehs_incidents" alter column "severity" set default 'near_miss'::public.ehs_incident_severity;

alter table "public"."ehs_incidents" alter column "severity" set data type public.ehs_incident_severity using "severity"::text::public.ehs_incident_severity;

alter table "public"."ehs_incidents" alter column "status" set default 'reported'::public.ehs_incident_status;

alter table "public"."ehs_incidents" alter column "status" set data type public.ehs_incident_status using "status"::text::public.ehs_incident_status;

alter table "public"."ehs_inspection_items" alter column "result" set data type public.ehs_inspection_result using "result"::text::public.ehs_inspection_result;

alter table "public"."ehs_inspections" alter column "status" set default 'scheduled'::public.ehs_inspection_status;

alter table "public"."ehs_inspections" alter column "status" set data type public.ehs_inspection_status using "status"::text::public.ehs_inspection_status;

alter table "public"."ehs_inspections" alter column "type" set default 'daily'::public.ehs_inspection_type;

alter table "public"."ehs_inspections" alter column "type" set data type public.ehs_inspection_type using "type"::text::public.ehs_inspection_type;

alter table "public"."ehs_permits" alter column "permit_type" set default 'other'::public.ehs_permit_type;

alter table "public"."ehs_permits" alter column "permit_type" set data type public.ehs_permit_type using "permit_type"::text::public.ehs_permit_type;

alter table "public"."ehs_permits" alter column "status" set default 'requested'::public.ehs_permit_status;

alter table "public"."ehs_permits" alter column "status" set data type public.ehs_permit_status using "status"::text::public.ehs_permit_status;

alter table "public"."ehs_ppe_records" alter column "condition" set default 'new'::public.ehs_ppe_condition;

alter table "public"."ehs_ppe_records" alter column "condition" set data type public.ehs_ppe_condition using "condition"::text::public.ehs_ppe_condition;

alter table "public"."ehs_ppe_records" alter column "status" set default 'issued'::public.ehs_ppe_status;

alter table "public"."ehs_ppe_records" alter column "status" set data type public.ehs_ppe_status using "status"::text::public.ehs_ppe_status;

-- Skip ehs_risk_assessment_items column type changes — columns are already enum types
-- (from earlier migration 20260308211549) and cannot be altered due to generated column deps.
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ehs_risk_assessment_items'
        AND column_name = 'consequence_after') = 'text' THEN
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN consequence_after SET DEFAULT 'minor'::public.ehs_risk_consequence;
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN consequence_after SET DATA TYPE public.ehs_risk_consequence USING consequence_after::text::public.ehs_risk_consequence;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ehs_risk_assessment_items'
        AND column_name = 'consequence_before') = 'text' THEN
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN consequence_before SET DEFAULT 'moderate'::public.ehs_risk_consequence;
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN consequence_before SET DATA TYPE public.ehs_risk_consequence USING consequence_before::text::public.ehs_risk_consequence;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ehs_risk_assessment_items'
        AND column_name = 'likelihood_after') = 'text' THEN
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN likelihood_after SET DEFAULT 'unlikely'::public.ehs_risk_likelihood;
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN likelihood_after SET DATA TYPE public.ehs_risk_likelihood USING likelihood_after::text::public.ehs_risk_likelihood;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ehs_risk_assessment_items'
        AND column_name = 'likelihood_before') = 'text' THEN
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN likelihood_before SET DEFAULT 'possible'::public.ehs_risk_likelihood;
    ALTER TABLE public.ehs_risk_assessment_items ALTER COLUMN likelihood_before SET DATA TYPE public.ehs_risk_likelihood USING likelihood_before::text::public.ehs_risk_likelihood;
  END IF;
END $$;

-- risk_score_after and risk_score_before are GENERATED ALWAYS AS columns; cannot set default.
-- Skipping these SET DEFAULT statements.

alter table "public"."ehs_risk_assessments" alter column "status" set default 'draft'::public.ehs_risk_assessment_status;

alter table "public"."ehs_risk_assessments" alter column "status" set data type public.ehs_risk_assessment_status using "status"::text::public.ehs_risk_assessment_status;

alter table "public"."ehs_training_records" alter column "status" set default 'valid'::public.ehs_training_status;

alter table "public"."ehs_training_records" alter column "status" set data type public.ehs_training_status using "status"::text::public.ehs_training_status;

alter table "public"."ehs_training_records" alter column "training_type" set default 'other'::public.ehs_training_type;

alter table "public"."ehs_training_records" alter column "training_type" set data type public.ehs_training_type using "training_type"::text::public.ehs_training_type;

alter table "public"."email_events" enable row level security;

alter table "public"."email_outbox" enable row level security;

alter table "public"."email_placeholders" enable row level security;

alter table "public"."email_templates" enable row level security;

alter table "public"."email_triggers" enable row level security;

alter table "public"."employee_categories" enable row level security;

alter table "public"."employee_time_policies" alter column "attendance_mode" set default 'MOBILE_GPS'::public.attendance_mode_enum;

alter table "public"."employee_time_policies" alter column "attendance_mode" set data type public.attendance_mode_enum using "attendance_mode"::text::public.attendance_mode_enum;

alter table "public"."employee_time_policies" alter column "tracking_type" set default 'MANDATORY'::public.tracking_type_enum;

alter table "public"."employee_time_policies" alter column "tracking_type" set data type public.tracking_type_enum using "tracking_type"::text::public.tracking_type_enum;

alter table "public"."employee_types" enable row level security;

alter table "public"."employees" drop column "department";

alter table "public"."employees" add column "social_security_number" text;

alter table "public"."employees" alter column "employment_status" set default 'Active'::text;

alter table "public"."employees" alter column "organization_id" set not null;

alter table "public"."employees" alter column "pay_type" set default 'hourly'::public.pay_type;

alter table "public"."employees" alter column "pay_type" set data type public.pay_type using "pay_type"::text::public.pay_type;

alter table "public"."expatriate_pay_groups" alter column "organization_id" set not null;

alter table "public"."expatriate_pay_run_item_allowances" enable row level security;

alter table "public"."expatriate_pay_run_items" add column "base_currency" text default 'UGX'::text;

alter table "public"."expatriate_pay_run_items" add column "education_allowance" numeric(12,2) default 0.00;

alter table "public"."expatriate_pay_run_items" add column "exchange_rate" numeric default 0;

alter table "public"."expatriate_pay_run_items" add column "foreign_currency" character varying(3) not null default 'USD'::character varying;

alter table "public"."expatriate_pay_run_items" add column "gross_foreign" numeric(12,2) not null default 0.00;

alter table "public"."expatriate_pay_run_items" add column "housing_allowance" numeric(12,2) default 0.00;

alter table "public"."expatriate_pay_run_items" add column "local_currency" character varying(3) not null default 'UGX'::character varying;

alter table "public"."expatriate_pay_run_items" add column "local_gross_pay" numeric default 0;

alter table "public"."expatriate_pay_run_items" add column "local_net_pay" numeric default 0;

alter table "public"."expatriate_pay_run_items" add column "medical_allowance" numeric(12,2) default 0.00;

alter table "public"."expatriate_pay_run_items" add column "notes" text;

alter table "public"."expatriate_pay_run_items" add column "organization_id" uuid not null;

alter table "public"."expatriate_pay_run_items" add column "status" character varying(20) not null default 'draft'::character varying;

alter table "public"."expatriate_pay_run_items" add column "tax_rate" numeric(5,2) default 15.00;

alter table "public"."expatriate_pay_run_items" add column "transport_allowance" numeric(12,2) default 0.00;

alter table "public"."expatriate_pay_run_items" alter column "days_worked" set default 0;

alter table "public"."geofences" alter column "type" set default 'office'::public.geofence_type_enum;

alter table "public"."geofences" alter column "type" set data type public.geofence_type_enum using "type"::text::public.geofence_type_enum;

alter table "public"."head_office_pay_group_company_units" alter column "pay_group_type" set data type public.head_office_pay_group_type using "pay_group_type"::text::public.head_office_pay_group_type;

alter table "public"."head_office_pay_group_company_units" enable row level security;

alter table "public"."head_office_pay_group_members" alter column "pay_group_type" set data type public.head_office_pay_group_type using "pay_group_type"::text::public.head_office_pay_group_type;

alter table "public"."head_office_pay_groups_expatriates" alter column "status" set default 'draft'::public.head_office_status;

alter table "public"."head_office_pay_groups_expatriates" alter column "status" set data type public.head_office_status using "status"::text::public.head_office_status;

alter table "public"."head_office_pay_groups_expatriates" enable row level security;

alter table "public"."head_office_pay_groups_interns" alter column "status" set default 'draft'::public.head_office_status;

alter table "public"."head_office_pay_groups_interns" alter column "status" set data type public.head_office_status using "status"::text::public.head_office_status;

alter table "public"."head_office_pay_groups_interns" enable row level security;

alter table "public"."head_office_pay_groups_regular" alter column "status" set default 'draft'::public.head_office_status;

alter table "public"."head_office_pay_groups_regular" alter column "status" set data type public.head_office_status using "status"::text::public.head_office_status;

alter table "public"."head_office_pay_groups_regular" enable row level security;

alter table "public"."head_office_pay_run_items" enable row level security;

alter table "public"."head_office_pay_runs" alter column "pay_group_type" set data type public.head_office_pay_group_type using "pay_group_type"::text::public.head_office_pay_group_type;

alter table "public"."head_office_pay_runs" enable row level security;

alter table "public"."impersonation_logs" enable row level security;

alter table "public"."intern_pay_run_items" enable row level security;

alter table "public"."local_pay_run_items" enable row level security;

alter table "public"."lst_employee_assignments" enable row level security;

alter table "public"."lst_payment_plans" enable row level security;

alter table "public"."notifications" enable row level security;

alter table "public"."org_license_assignments" enable row level security;

alter table "public"."org_licenses" enable row level security;

alter table "public"."org_roles" enable row level security;

alter table "public"."org_settings" drop column "probation_period_days";

alter table "public"."org_settings" enable row level security;

alter table "public"."org_user_roles" enable row level security;

alter table "public"."org_users" enable row level security;

alter table "public"."pay_group_master" add column "sub_type" text;

alter table "public"."pay_groups" drop column "company_id";

alter table "public"."pay_groups" add column "project_id" uuid;

alter table "public"."pay_groups" add column "project_type" text;

alter table "public"."pay_groups" alter column "organization_id" set not null;

alter table "public"."pay_groups" alter column "pay_frequency" set default 'monthly'::public.pay_frequency;

alter table "public"."pay_groups" alter column "pay_frequency" drop not null;

alter table "public"."pay_groups" alter column "pay_frequency" set data type text using "pay_frequency"::text;

alter table "public"."pay_groups" alter column "type" set default 'local'::public.pay_group_type;

alter table "public"."pay_groups" alter column "type" set not null;

alter table "public"."pay_groups" alter column "type" set data type public.pay_group_type using "type"::public.pay_group_type;

alter table "public"."pay_items" drop column "company_id";

alter table "public"."pay_items" alter column "organization_id" set not null;

alter table "public"."pay_items" alter column "status" set default 'draft'::public.pay_item_status;

alter table "public"."pay_items" alter column "status" set data type public.pay_item_status using "status"::text::public.pay_item_status;

alter table "public"."pay_runs" alter column "organization_id" set not null;

alter table "public"."pay_runs" alter column "status" set default 'draft'::public.pay_run_status;

alter table "public"."pay_runs" alter column "status" set data type public.pay_run_status using "status"::text::public.pay_run_status;

alter table "public"."paygroup_employees" add column "pay_group_master_id" uuid;

alter table "public"."paygroup_employees" add column "removed_at" timestamp with time zone;

alter table "public"."paygroup_employees" alter column "employee_id" set not null;

alter table "public"."paygroup_employees" enable row level security;

alter table "public"."payroll_approval_categories" drop column "created_at";

alter table "public"."payroll_approval_categories" drop column "id";

alter table "public"."payroll_configurations" enable row level security;

alter table "public"."payrun_approval_steps" enable row level security;

alter table "public"."payrun_employees" alter column "employee_id" set not null;

alter table "public"."payrun_employees" alter column "pay_group_id" set not null;

alter table "public"."payrun_employees" alter column "pay_run_id" set not null;

alter table "public"."payrun_employees" enable row level security;

alter table "public"."platform_admins" alter column "allowed" set default false;

alter table "public"."platform_admins" alter column "allowed" set not null;

alter table "public"."platform_admins" alter column "created_at" set not null;

alter table "public"."platform_admins" alter column "role" set default 'super_admin'::public.platform_admin_role;

alter table "public"."platform_admins" alter column "role" set not null;

alter table "public"."platform_admins" alter column "role" set data type public.platform_admin_role using "role"::public.platform_admin_role;

alter table "public"."platform_admins" alter column "updated_at" set not null;

alter table "public"."platform_email_settings" enable row level security;

alter table "public"."profiles" add column "failed_login_attempts" integer not null default 0;

alter table "public"."profiles" add column "locked_at" timestamp with time zone;

alter table "public"."profiles" add column "organization_id" uuid;

alter table "public"."projects" drop column "company_id";

alter table "public"."projects" drop column "country";

alter table "public"."projects" drop column "currency";

alter table "public"."rbac_grants" drop column "created_by";

alter table "public"."rbac_grants" drop column "reason";

alter table "public"."rbac_grants" add column "granted_by" uuid;

alter table "public"."reminder_rules" alter column "created_at" drop not null;

alter table "public"."reminder_rules" alter column "is_active" drop not null;

alter table "public"."reminder_rules" alter column "notify_roles" drop default;

alter table "public"."reminder_rules" alter column "notify_roles" drop not null;

alter table "public"."reminder_rules" alter column "updated_at" drop not null;

alter table "public"."sub_departments" drop column "company_id";

alter table "public"."sub_departments" drop column "description";

alter table "public"."sub_departments" drop column "organization_id";

alter table "public"."sub_departments" add column "company_unit_id" uuid not null;

alter table "public"."sub_departments" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."sub_departments" alter column "created_at" set not null;

alter table "public"."sub_departments" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."sub_departments" alter column "updated_at" set not null;

alter table "public"."sub_departments" enable row level security;

alter table "public"."tenant_email_settings" enable row level security;

alter table "public"."user_company_memberships" enable row level security;

alter table "public"."user_invites" drop column "accepted_at";

alter table "public"."user_invites" drop column "token_hash";

alter table "public"."user_invites" alter column "expires_at" drop not null;

alter table "public"."user_invites" alter column "role_data" drop default;

alter table "public"."user_invites" alter column "role_data" drop not null;

alter table "public"."user_invites" alter column "status" drop not null;

alter table "public"."user_invites" alter column "status" set data type text using "status"::text;

alter table "public"."user_invites" alter column "status" set default 'pending'::text;

alter table "public"."user_profiles" drop column "failed_login_attempts";

alter table "public"."user_profiles" drop column "is_platform_admin";

alter table "public"."user_profiles" drop column "locked_at";

alter table "public"."user_profiles" drop column "locked_by";

alter table "public"."user_profiles" drop column "lockout_reason";

alter table "public"."user_profiles" drop column "platform_admin_role";

alter table "public"."user_profiles" drop column "unlocked_at";

alter table "public"."user_profiles" drop column "unlocked_by";

alter table "public"."user_roles" alter column "role" set data type public.app_role using "role"::text::public.app_role;

drop type "public"."approle";

drop type "public"."benefittype";

drop type "public"."invite_status";

drop type "public"."payfrequency";

drop type "public"."paygrouptype";

drop type "public"."payitemstatus";

drop type "public"."paytype";

CREATE INDEX idx_ippms_attendance_payrun ON ippms.ippms_attendance_records USING btree (payrun_id) WHERE (payrun_id IS NOT NULL);

CREATE INDEX idx_ippms_attendance_project_date ON ippms.ippms_attendance_records USING btree (project_id, attendance_date);

CREATE INDEX idx_ippms_employee_shifts_emp ON ippms.ippms_employee_shifts USING btree (employee_id, project_id, start_date);

CREATE INDEX idx_ippms_holidays_date ON ippms.ippms_holidays USING btree (holiday_date);

CREATE INDEX idx_ippms_leave_requests_emp ON ippms.ippms_leave_requests USING btree (employee_id, start_date, end_date);

CREATE INDEX idx_ippms_piece_entries_payrun ON ippms.ippms_piece_work_entries USING btree (payrun_id) WHERE (payrun_id IS NOT NULL);

CREATE INDEX idx_ippms_piece_entries_project_date ON ippms.ippms_piece_work_entries USING btree (project_id, work_date);

CREATE INDEX idx_ippms_work_days_payrun ON ippms.ippms_work_days USING btree (payrun_id) WHERE (payrun_id IS NOT NULL);

CREATE INDEX idx_ippms_work_days_project_date ON ippms.ippms_work_days USING btree (project_id, work_date);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_attendance_records_pkey ON ippms.ippms_attendance_records USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_employee_shifts_pkey ON ippms.ippms_employee_shifts USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_holidays_pkey ON ippms.ippms_holidays USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_leave_requests_pkey ON ippms.ippms_leave_requests USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_leave_types_pkey ON ippms.ippms_leave_types USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_piece_work_catalogue_pkey ON ippms.ippms_piece_work_catalogue USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_piece_work_entries_pkey ON ippms.ippms_piece_work_entries USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_piece_work_rates_pkey ON ippms.ippms_piece_work_rates USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_shifts_pkey ON ippms.ippms_shifts USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS ippms_work_days_pkey ON ippms.ippms_work_days USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_holiday_per_project ON ippms.ippms_holidays USING btree (project_id, holiday_date);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_leave_code ON ippms.ippms_leave_types USING btree (code);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_piece_catalogue_code ON ippms.ippms_piece_work_catalogue USING btree (code);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_piece_rate_window ON ippms.ippms_piece_work_rates USING btree (employee_id, project_id, piece_id, start_date);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_shift_assignment ON ippms.ippms_employee_shifts USING btree (employee_id, project_id, shift_id, start_date);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_work_day ON ippms.ippms_work_days USING btree (employee_id, project_id, work_date);

CREATE UNIQUE INDEX IF NOT EXISTS access_grants_pkey ON public.access_grants USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_pkey ON public.activity_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS approval_workflow_steps_pkey ON public.approval_workflow_steps USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS approval_workflow_steps_workflow_id_level_key ON public.approval_workflow_steps USING btree (workflow_id, level);

CREATE UNIQUE INDEX IF NOT EXISTS auth_events_pkey ON public.auth_events USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS cleanup_logs_pkey ON public.cleanup_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS company_unit_categories_company_unit_id_category_id_key ON public.company_unit_categories USING btree (company_unit_id, category_id);

CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_pkey ON public.contract_templates USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_pay_run_items_pay_run_id_employee_id_key ON public.contractor_pay_run_items USING btree (pay_run_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS contractor_pay_run_items_pkey ON public.contractor_pay_run_items USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS countries_code_key ON public.countries USING btree (code);

CREATE UNIQUE INDEX IF NOT EXISTS countries_pkey ON public.countries USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_company_unit_id_key ON public.sub_departments USING btree (name, company_unit_id);

CREATE UNIQUE INDEX IF NOT EXISTS departments_pkey ON public.sub_departments USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS email_events_pkey ON public.email_events USING btree (key);

CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_pkey ON public.email_outbox USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS email_placeholders_pkey ON public.email_placeholders USING btree (key);

CREATE UNIQUE INDEX IF NOT EXISTS email_triggers_org_id_event_key_key ON public.email_triggers USING btree (org_id, event_key);

CREATE UNIQUE INDEX IF NOT EXISTS email_triggers_pkey ON public.email_triggers USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS employee_categories_organization_id_key_key ON public.employee_categories USING btree (organization_id, key);

CREATE UNIQUE INDEX IF NOT EXISTS employee_contracts_pkey ON public.employee_contracts USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS employee_types_name_key ON public.employee_types USING btree (name);

CREATE UNIQUE INDEX IF NOT EXISTS employee_types_pkey ON public.employee_types USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS expatriate_pay_run_item_allowances_pkey ON public.expatriate_pay_run_item_allowances USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_group_company_units_pkey ON public.head_office_pay_group_company_units USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_group_members_pkey ON public.head_office_pay_group_members USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_groups_expatriates_pkey ON public.head_office_pay_groups_expatriates USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_groups_interns_pkey ON public.head_office_pay_groups_interns USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_groups_regular_pkey ON public.head_office_pay_groups_regular USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_run_items_pkey ON public.head_office_pay_run_items USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_runs_pay_run_id_key ON public.head_office_pay_runs USING btree (pay_run_id);

CREATE UNIQUE INDEX IF NOT EXISTS head_office_pay_runs_pkey ON public.head_office_pay_runs USING btree (id);

CREATE INDEX idx_access_grants_company ON public.access_grants USING btree (org_id, company_id);

CREATE INDEX idx_access_grants_org ON public.access_grants USING btree (org_id);

CREATE INDEX idx_access_grants_scope ON public.access_grants USING btree (scope_type, scope_key);

CREATE INDEX idx_access_grants_user ON public.access_grants USING btree (org_id, user_id);

CREATE INDEX idx_activity_logs_org_id ON public.activity_logs USING btree (organization_id);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);

CREATE INDEX idx_banks_country_code ON public.banks USING btree (country_code);

CREATE INDEX idx_banks_name ON public.banks USING btree (name);

CREATE INDEX idx_companies_org ON public.companies USING btree (organization_id);

CREATE INDEX idx_companies_org_id ON public.companies USING btree (organization_id);

CREATE INDEX idx_companies_short_code ON public.companies USING btree (lower(short_code));

CREATE INDEX idx_company_units_active ON public.company_units USING btree (active);

CREATE INDEX idx_company_units_company_id ON public.company_units USING btree (company_id);

CREATE INDEX idx_contractor_pay_run_items_employee_id ON public.contractor_pay_run_items USING btree (employee_id);

CREATE INDEX idx_contractor_pay_run_items_pay_run_id ON public.contractor_pay_run_items USING btree (pay_run_id);

CREATE INDEX idx_contractor_pay_run_items_project_id ON public.contractor_pay_run_items USING btree (project_id);

CREATE INDEX idx_contractor_pay_run_items_status ON public.contractor_pay_run_items USING btree (status);

CREATE INDEX idx_countries_code ON public.countries USING btree (code);

CREATE INDEX idx_countries_name ON public.countries USING btree (name);

CREATE INDEX idx_email_outbox_org ON public.email_outbox USING btree (org_id);

CREATE INDEX idx_email_outbox_status ON public.email_outbox USING btree (status);

CREATE INDEX idx_employees_category_sub_type ON public.employees USING btree (category, sub_type);

CREATE INDEX idx_employees_company ON public.employees USING btree (company_id);

CREATE INDEX idx_employees_date_joined ON public.employees USING btree (date_joined);

CREATE INDEX idx_employees_employee_category ON public.employees USING btree (employee_category);

CREATE INDEX idx_employees_employee_type ON public.employees USING btree (employee_type);

CREATE INDEX idx_employees_employment_status ON public.employees USING btree (employment_status);

CREATE INDEX idx_employees_org_id ON public.employees USING btree (organization_id);

CREATE INDEX idx_employees_project_id ON public.employees USING btree (project_id);

CREATE INDEX idx_employees_ssn ON public.employees USING btree (social_security_number);

CREATE INDEX idx_expatriate_allowances_item_id ON public.expatriate_pay_run_item_allowances USING btree (expatriate_pay_run_item_id);

CREATE INDEX idx_expatriate_allowances_name ON public.expatriate_pay_run_item_allowances USING btree (name);

CREATE INDEX idx_expatriate_pay_groups_org_id ON public.expatriate_pay_groups USING btree (organization_id);

CREATE INDEX idx_expatriate_pay_run_items_days_worked ON public.expatriate_pay_run_items USING btree (days_worked);

CREATE INDEX idx_expatriate_pay_run_items_exchange_rate ON public.expatriate_pay_run_items USING btree (exchange_rate);

CREATE INDEX idx_expatriate_pay_run_items_org_id ON public.expatriate_pay_run_items USING btree (organization_id);

CREATE INDEX idx_expatriate_pay_run_items_pay_group_id ON public.expatriate_pay_run_items USING btree (expatriate_pay_group_id);

CREATE INDEX idx_expatriate_pay_run_items_status ON public.expatriate_pay_run_items USING btree (status);

CREATE INDEX idx_ho_members_employee ON public.head_office_pay_group_members USING btree (employee_id);

CREATE INDEX idx_ho_members_group ON public.head_office_pay_group_members USING btree (pay_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ho_members_unique_active ON public.head_office_pay_group_members USING btree (pay_group_id, employee_id) WHERE (active = true);

CREATE INDEX idx_ho_runs_organization ON public.head_office_pay_runs USING btree (organization_id);

CREATE INDEX idx_ho_units_group ON public.head_office_pay_group_company_units USING btree (pay_group_id);

CREATE INDEX idx_impersonation_logs_super_admin_id ON public.impersonation_logs USING btree (super_admin_id);

CREATE INDEX idx_impersonation_logs_target_org_id ON public.impersonation_logs USING btree (target_organization_id);

CREATE INDEX idx_intern_pay_run_items_employee_id ON public.intern_pay_run_items USING btree (employee_id);

CREATE INDEX idx_intern_pay_run_items_mentor_id ON public.intern_pay_run_items USING btree (mentor_id);

CREATE INDEX idx_intern_pay_run_items_pay_run_id ON public.intern_pay_run_items USING btree (pay_run_id);

CREATE INDEX idx_intern_pay_run_items_status ON public.intern_pay_run_items USING btree (status);

CREATE INDEX idx_local_pay_run_items_employee_id ON public.local_pay_run_items USING btree (employee_id);

CREATE INDEX idx_local_pay_run_items_pay_run_id ON public.local_pay_run_items USING btree (pay_run_id);

CREATE INDEX idx_local_pay_run_items_status ON public.local_pay_run_items USING btree (status);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at) WHERE (read_at IS NULL);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);

CREATE INDEX idx_org_license_assignments_org ON public.org_license_assignments USING btree (org_id);

CREATE INDEX idx_org_license_assignments_user ON public.org_license_assignments USING btree (user_id);

CREATE INDEX idx_org_roles_org ON public.org_roles USING btree (org_id);

CREATE INDEX idx_org_user_roles_org_user ON public.org_user_roles USING btree (org_user_id);

CREATE INDEX idx_org_user_roles_role ON public.org_user_roles USING btree (role_id);

CREATE INDEX idx_org_users_org ON public.org_users USING btree (org_id);

CREATE INDEX idx_org_users_user ON public.org_users USING btree (user_id);

CREATE INDEX idx_organizations_active ON public.organizations USING btree (active);

CREATE INDEX idx_organizations_default_company_id ON public.organizations USING btree (default_company_id);

CREATE INDEX idx_pay_group_master_category_sub_type ON public.pay_group_master USING btree (category, sub_type);

CREATE INDEX idx_pay_group_master_source ON public.pay_group_master USING btree (source_table, source_id);

CREATE INDEX idx_pay_groups_category_employee_type ON public.pay_groups USING btree (category, employee_type);

CREATE INDEX idx_pay_groups_category_project_type ON public.pay_groups USING btree (category, project_type);

CREATE INDEX idx_pay_groups_category_sub_type ON public.pay_groups USING btree (category, employee_type);

CREATE INDEX idx_pay_groups_ippms_pay_type ON public.pay_groups USING btree (pay_type) WHERE (employee_type = 'ippms'::text);

CREATE INDEX idx_pay_groups_org_id ON public.pay_groups USING btree (organization_id);

CREATE INDEX idx_pay_groups_pay_frequency ON public.pay_groups USING btree (pay_frequency) WHERE (pay_frequency IS NOT NULL);

CREATE INDEX idx_pay_groups_project_filters ON public.pay_groups USING btree (project_type, pay_type, project_id);

CREATE INDEX idx_pay_groups_project_id ON public.pay_groups USING btree (project_id);

CREATE INDEX idx_pay_groups_project_type_pay_type ON public.pay_groups USING btree (project_type, pay_type) WHERE (project_type IS NOT NULL);

CREATE INDEX idx_pay_groups_type ON public.pay_groups USING btree (type);

CREATE INDEX idx_pay_items_org_id ON public.pay_items USING btree (organization_id);

CREATE INDEX idx_pay_runs_category_sub_type ON public.pay_runs USING btree (category, sub_type);

CREATE INDEX idx_pay_runs_company ON public.pay_runs USING btree (company_id);

CREATE INDEX idx_pay_runs_days_worked ON public.pay_runs USING btree (days_worked);

CREATE INDEX idx_pay_runs_exchange_rate ON public.pay_runs USING btree (exchange_rate);

CREATE INDEX idx_pay_runs_org ON public.pay_runs USING btree (organization_id);

CREATE INDEX idx_pay_runs_org_id ON public.pay_runs USING btree (organization_id);

CREATE INDEX idx_pay_runs_pay_frequency ON public.pay_runs USING btree (pay_frequency) WHERE (pay_frequency IS NOT NULL);

CREATE INDEX idx_pay_runs_pay_group_master_id ON public.pay_runs USING btree (pay_group_master_id);

CREATE INDEX idx_pay_runs_pay_type ON public.pay_runs USING btree (pay_type);

CREATE INDEX idx_pay_runs_project_id ON public.pay_runs USING btree (project_id);

CREATE INDEX idx_paygroup_employees_active ON public.paygroup_employees USING btree (active);

CREATE INDEX idx_paygroup_employees_employee_id ON public.paygroup_employees USING btree (employee_id);

CREATE INDEX idx_paygroup_employees_employee_id_all ON public.paygroup_employees USING btree (employee_id);

CREATE INDEX idx_paygroup_employees_pay_group_id ON public.paygroup_employees USING btree (pay_group_id);

CREATE INDEX idx_paygroup_employees_pay_group_master_id ON public.paygroup_employees USING btree (pay_group_master_id);

CREATE INDEX idx_paygroup_employees_removed_at ON public.paygroup_employees USING btree (removed_at);

CREATE INDEX idx_payrun_employees_employee_id ON public.payrun_employees USING btree (employee_id);

CREATE INDEX idx_payrun_employees_pay_group_id ON public.payrun_employees USING btree (pay_group_id);

CREATE INDEX idx_payrun_employees_pay_run_id ON public.payrun_employees USING btree (pay_run_id);

CREATE INDEX idx_pge_active ON public.paygroup_employees USING btree (active);

CREATE INDEX idx_pge_employee ON public.paygroup_employees USING btree (employee_id);

CREATE INDEX idx_pge_group ON public.paygroup_employees USING btree (pay_group_id);

CREATE INDEX idx_pgm_ippms_pay_type ON public.pay_group_master USING btree (pay_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_settings_singleton ON public.platform_email_settings USING btree ((true));

CREATE INDEX idx_projects_project_type ON public.projects USING btree (project_type);

CREATE INDEX idx_projects_status_type ON public.projects USING btree (status, project_type);

CREATE INDEX idx_projects_type ON public.projects USING btree (project_type, project_subtype);

CREATE INDEX idx_ucm_company ON public.user_company_memberships USING btree (company_id);

CREATE INDEX idx_ucm_user ON public.user_company_memberships USING btree (user_id);

CREATE INDEX idx_user_profiles_org_id ON public.user_profiles USING btree (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS impersonation_logs_pkey ON public.impersonation_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS intern_pay_run_items_pay_run_id_employee_id_key ON public.intern_pay_run_items USING btree (pay_run_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS intern_pay_run_items_pkey ON public.intern_pay_run_items USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS items_catalog_pkey ON public.items_catalog USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS local_pay_run_items_pay_run_id_employee_id_key ON public.local_pay_run_items USING btree (pay_run_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS local_pay_run_items_pkey ON public.local_pay_run_items USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS org_license_assignments_org_id_user_id_key ON public.org_license_assignments USING btree (org_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS org_license_assignments_pkey ON public.org_license_assignments USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS org_licenses_pkey ON public.org_licenses USING btree (org_id);

CREATE UNIQUE INDEX IF NOT EXISTS org_roles_org_id_key_key ON public.org_roles USING btree (org_id, key);

CREATE UNIQUE INDEX IF NOT EXISTS org_roles_pkey ON public.org_roles USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS org_settings_organization_id_key ON public.org_settings USING btree (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS org_settings_pkey ON public.org_settings USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS org_user_roles_org_user_id_role_id_key ON public.org_user_roles USING btree (org_user_id, role_id);

CREATE UNIQUE INDEX IF NOT EXISTS org_user_roles_pkey ON public.org_user_roles USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS org_users_org_id_user_id_key ON public.org_users USING btree (org_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS org_users_pkey ON public.org_users USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS organization_security_settings_org_id_key ON public.organization_security_settings USING btree (org_id);

CREATE UNIQUE INDEX IF NOT EXISTS organization_security_settings_pkey ON public.organization_security_settings USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS paygroup_employees_employee_id_key ON public.paygroup_employees USING btree (employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_configurations_pkey ON public.payroll_configurations USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS payrun_approval_steps_payrun_id_level_key ON public.payrun_approval_steps USING btree (payrun_id, level);

CREATE UNIQUE INDEX IF NOT EXISTS payrun_approval_steps_pkey ON public.payrun_approval_steps USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS payrun_employees_pay_run_id_employee_id_key ON public.payrun_employees USING btree (pay_run_id, employee_id);

CREATE INDEX platform_admin_devices_admin_id_idx ON public.platform_admin_devices USING btree (admin_id);

CREATE UNIQUE INDEX IF NOT EXISTS platform_admin_devices_device_id_key ON public.platform_admin_devices USING btree (device_id);

CREATE UNIQUE INDEX IF NOT EXISTS platform_admin_devices_pkey ON public.platform_admin_devices USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_auth_user_id_idx ON public.platform_admins USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS platform_email_settings_pkey ON public.platform_email_settings USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS probation_reminder_logs_employee_id_reminder_type_key ON public.probation_reminder_logs USING btree (employee_id, reminder_type);

CREATE UNIQUE INDEX IF NOT EXISTS probation_reminder_logs_pkey ON public.probation_reminder_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS project_onboarding_steps_pkey ON public.project_onboarding_steps USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS project_onboarding_steps_project_id_step_key_key ON public.project_onboarding_steps USING btree (project_id, step_key);

CREATE UNIQUE INDEX IF NOT EXISTS projects_code_key ON public.projects USING btree (code);

CREATE UNIQUE INDEX IF NOT EXISTS projects_name_key ON public.projects USING btree (name);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_email_settings_pkey ON public.tenant_email_settings USING btree (org_id);

CREATE UNIQUE INDEX IF NOT EXISTS timesheet_departments_organization_id_name_key ON public.timesheet_departments USING btree (organization_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS timesheet_departments_pkey ON public.timesheet_departments USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS timesheet_entries_pkey ON public.timesheet_entries USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS timesheet_entries_timesheet_id_work_date_key ON public.timesheet_entries USING btree (timesheet_id, work_date);

CREATE UNIQUE INDEX IF NOT EXISTS timesheets_pkey ON public.timesheets USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_paygroup_employees_employee_active ON public.paygroup_employees USING btree (employee_id) WHERE (active = true);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_employee_paygroup ON public.paygroup_employees USING btree (employee_id) WHERE (active = true);

CREATE UNIQUE INDEX IF NOT EXISTS unique_employee_in_paygroup ON public.paygroup_employees USING btree (employee_id, pay_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_company_memberships_pkey ON public.user_company_memberships USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_company_memberships_user_id_company_id_key ON public.user_company_memberships USING btree (user_id, company_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_management_invitations_pkey ON public.user_management_invitations USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_management_invitations_token_key ON public.user_management_invitations USING btree (token);

CREATE UNIQUE INDEX IF NOT EXISTS user_management_profiles_pkey ON public.user_management_profiles USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_management_profiles_user_id_key ON public.user_management_profiles USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS variable_item_logs_pkey ON public.variable_item_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS variable_pay_cycles_pkey ON public.variable_pay_cycles USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS variable_pay_summaries_cycle_id_employee_id_key ON public.variable_pay_summaries USING btree (cycle_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS variable_pay_summaries_pkey ON public.variable_pay_summaries USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS variable_work_logs_cycle_id_employee_id_work_date_key ON public.variable_work_logs USING btree (cycle_id, employee_id, work_date);

CREATE UNIQUE INDEX IF NOT EXISTS variable_work_logs_pkey ON public.variable_work_logs USING btree (id);

CREATE INDEX idx_employees_probation_end_date ON public.employees USING btree (probation_end_date) WHERE (probation_end_date IS NOT NULL);

CREATE INDEX idx_employees_sub_department ON public.employees USING btree (sub_department);

CREATE INDEX idx_reminder_rules_org_type ON public.reminder_rules USING btree (organization_id, rule_type);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_approval_categories_pkey ON public.payroll_approval_categories USING btree (config_id, category_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_attendance_records_pkey') THEN
    alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_pkey" PRIMARY KEY using index "ippms_attendance_records_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_employee_shifts_pkey') THEN
    alter table "ippms"."ippms_employee_shifts" add constraint "ippms_employee_shifts_pkey" PRIMARY KEY using index "ippms_employee_shifts_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_holidays_pkey') THEN
    alter table "ippms"."ippms_holidays" add constraint "ippms_holidays_pkey" PRIMARY KEY using index "ippms_holidays_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_leave_requests_pkey') THEN
    alter table "ippms"."ippms_leave_requests" add constraint "ippms_leave_requests_pkey" PRIMARY KEY using index "ippms_leave_requests_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_leave_types_pkey') THEN
    alter table "ippms"."ippms_leave_types" add constraint "ippms_leave_types_pkey" PRIMARY KEY using index "ippms_leave_types_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_piece_work_catalogue_pkey') THEN
    alter table "ippms"."ippms_piece_work_catalogue" add constraint "ippms_piece_work_catalogue_pkey" PRIMARY KEY using index "ippms_piece_work_catalogue_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_piece_work_entries_pkey') THEN
    alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_pkey" PRIMARY KEY using index "ippms_piece_work_entries_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_piece_work_rates_pkey') THEN
    alter table "ippms"."ippms_piece_work_rates" add constraint "ippms_piece_work_rates_pkey" PRIMARY KEY using index "ippms_piece_work_rates_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_shifts_pkey') THEN
    alter table "ippms"."ippms_shifts" add constraint "ippms_shifts_pkey" PRIMARY KEY using index "ippms_shifts_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ippms_work_days_pkey') THEN
    alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_pkey" PRIMARY KEY using index "ippms_work_days_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_grants_pkey') THEN
    alter table "public"."access_grants" add constraint "access_grants_pkey" PRIMARY KEY using index "access_grants_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_pkey') THEN
    alter table "public"."activity_logs" add constraint "activity_logs_pkey" PRIMARY KEY using index "activity_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approval_workflow_steps_pkey') THEN
    alter table "public"."approval_workflow_steps" add constraint "approval_workflow_steps_pkey" PRIMARY KEY using index "approval_workflow_steps_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_events_pkey') THEN
    alter table "public"."auth_events" add constraint "auth_events_pkey" PRIMARY KEY using index "auth_events_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cleanup_logs_pkey') THEN
    alter table "public"."cleanup_logs" add constraint "cleanup_logs_pkey" PRIMARY KEY using index "cleanup_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_templates_pkey') THEN
    alter table "public"."contract_templates" add constraint "contract_templates_pkey" PRIMARY KEY using index "contract_templates_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contractor_pay_run_items_pkey') THEN
    alter table "public"."contractor_pay_run_items" add constraint "contractor_pay_run_items_pkey" PRIMARY KEY using index "contractor_pay_run_items_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'countries_pkey') THEN
    alter table "public"."countries" add constraint "countries_pkey" PRIMARY KEY using index "countries_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_events_pkey') THEN
    alter table "public"."email_events" add constraint "email_events_pkey" PRIMARY KEY using index "email_events_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_outbox_pkey') THEN
    alter table "public"."email_outbox" add constraint "email_outbox_pkey" PRIMARY KEY using index "email_outbox_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_placeholders_pkey') THEN
    alter table "public"."email_placeholders" add constraint "email_placeholders_pkey" PRIMARY KEY using index "email_placeholders_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_triggers_pkey') THEN
    alter table "public"."email_triggers" add constraint "email_triggers_pkey" PRIMARY KEY using index "email_triggers_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_contracts_pkey') THEN
    alter table "public"."employee_contracts" add constraint "employee_contracts_pkey" PRIMARY KEY using index "employee_contracts_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_types_pkey') THEN
    alter table "public"."employee_types" add constraint "employee_types_pkey" PRIMARY KEY using index "employee_types_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expatriate_pay_run_item_allowances_pkey') THEN
    alter table "public"."expatriate_pay_run_item_allowances" add constraint "expatriate_pay_run_item_allowances_pkey" PRIMARY KEY using index "expatriate_pay_run_item_allowances_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_group_company_units_pkey') THEN
    alter table "public"."head_office_pay_group_company_units" add constraint "head_office_pay_group_company_units_pkey" PRIMARY KEY using index "head_office_pay_group_company_units_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_group_members_pkey') THEN
    alter table "public"."head_office_pay_group_members" add constraint "head_office_pay_group_members_pkey" PRIMARY KEY using index "head_office_pay_group_members_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_groups_expatriates_pkey') THEN
    alter table "public"."head_office_pay_groups_expatriates" add constraint "head_office_pay_groups_expatriates_pkey" PRIMARY KEY using index "head_office_pay_groups_expatriates_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_groups_interns_pkey') THEN
    alter table "public"."head_office_pay_groups_interns" add constraint "head_office_pay_groups_interns_pkey" PRIMARY KEY using index "head_office_pay_groups_interns_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_groups_regular_pkey') THEN
    alter table "public"."head_office_pay_groups_regular" add constraint "head_office_pay_groups_regular_pkey" PRIMARY KEY using index "head_office_pay_groups_regular_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_run_items_pkey') THEN
    alter table "public"."head_office_pay_run_items" add constraint "head_office_pay_run_items_pkey" PRIMARY KEY using index "head_office_pay_run_items_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'head_office_pay_runs_pkey') THEN
    alter table "public"."head_office_pay_runs" add constraint "head_office_pay_runs_pkey" PRIMARY KEY using index "head_office_pay_runs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_logs_pkey') THEN
    alter table "public"."impersonation_logs" add constraint "impersonation_logs_pkey" PRIMARY KEY using index "impersonation_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intern_pay_run_items_pkey') THEN
    alter table "public"."intern_pay_run_items" add constraint "intern_pay_run_items_pkey" PRIMARY KEY using index "intern_pay_run_items_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_catalog_pkey') THEN
    alter table "public"."items_catalog" add constraint "items_catalog_pkey" PRIMARY KEY using index "items_catalog_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'local_pay_run_items_pkey') THEN
    alter table "public"."local_pay_run_items" add constraint "local_pay_run_items_pkey" PRIMARY KEY using index "local_pay_run_items_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_pkey') THEN
    alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_license_assignments_pkey') THEN
    alter table "public"."org_license_assignments" add constraint "org_license_assignments_pkey" PRIMARY KEY using index "org_license_assignments_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_licenses_pkey') THEN
    alter table "public"."org_licenses" add constraint "org_licenses_pkey" PRIMARY KEY using index "org_licenses_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_roles_pkey') THEN
    alter table "public"."org_roles" add constraint "org_roles_pkey" PRIMARY KEY using index "org_roles_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_settings_pkey') THEN
    alter table "public"."org_settings" add constraint "org_settings_pkey" PRIMARY KEY using index "org_settings_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_user_roles_pkey') THEN
    alter table "public"."org_user_roles" add constraint "org_user_roles_pkey" PRIMARY KEY using index "org_user_roles_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_users_pkey') THEN
    alter table "public"."org_users" add constraint "org_users_pkey" PRIMARY KEY using index "org_users_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_security_settings_pkey') THEN
    alter table "public"."organization_security_settings" add constraint "organization_security_settings_pkey" PRIMARY KEY using index "organization_security_settings_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_configurations_pkey') THEN
    alter table "public"."payroll_configurations" add constraint "payroll_configurations_pkey" PRIMARY KEY using index "payroll_configurations_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payrun_approval_steps_pkey') THEN
    alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_pkey" PRIMARY KEY using index "payrun_approval_steps_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_admin_devices_pkey') THEN
    alter table "public"."platform_admin_devices" add constraint "platform_admin_devices_pkey" PRIMARY KEY using index "platform_admin_devices_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_email_settings_pkey') THEN
    alter table "public"."platform_email_settings" add constraint "platform_email_settings_pkey" PRIMARY KEY using index "platform_email_settings_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'probation_reminder_logs_pkey') THEN
    alter table "public"."probation_reminder_logs" add constraint "probation_reminder_logs_pkey" PRIMARY KEY using index "probation_reminder_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_onboarding_steps_pkey') THEN
    alter table "public"."project_onboarding_steps" add constraint "project_onboarding_steps_pkey" PRIMARY KEY using index "project_onboarding_steps_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_pkey') THEN
    alter table "public"."sub_departments" add constraint "departments_pkey" PRIMARY KEY using index "departments_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_email_settings_pkey') THEN
    alter table "public"."tenant_email_settings" add constraint "tenant_email_settings_pkey" PRIMARY KEY using index "tenant_email_settings_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_departments_pkey') THEN
    alter table "public"."timesheet_departments" add constraint "timesheet_departments_pkey" PRIMARY KEY using index "timesheet_departments_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_entries_pkey') THEN
    alter table "public"."timesheet_entries" add constraint "timesheet_entries_pkey" PRIMARY KEY using index "timesheet_entries_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheets_pkey') THEN
    alter table "public"."timesheets" add constraint "timesheets_pkey" PRIMARY KEY using index "timesheets_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_company_memberships_pkey') THEN
    alter table "public"."user_company_memberships" add constraint "user_company_memberships_pkey" PRIMARY KEY using index "user_company_memberships_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_management_invitations_pkey') THEN
    alter table "public"."user_management_invitations" add constraint "user_management_invitations_pkey" PRIMARY KEY using index "user_management_invitations_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_management_profiles_pkey') THEN
    alter table "public"."user_management_profiles" add constraint "user_management_profiles_pkey" PRIMARY KEY using index "user_management_profiles_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variable_item_logs_pkey') THEN
    alter table "public"."variable_item_logs" add constraint "variable_item_logs_pkey" PRIMARY KEY using index "variable_item_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variable_pay_cycles_pkey') THEN
    alter table "public"."variable_pay_cycles" add constraint "variable_pay_cycles_pkey" PRIMARY KEY using index "variable_pay_cycles_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variable_pay_summaries_pkey') THEN
    alter table "public"."variable_pay_summaries" add constraint "variable_pay_summaries_pkey" PRIMARY KEY using index "variable_pay_summaries_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variable_work_logs_pkey') THEN
    alter table "public"."variable_work_logs" add constraint "variable_work_logs_pkey" PRIMARY KEY using index "variable_work_logs_pkey";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_approval_categories_pkey') THEN
    alter table "public"."payroll_approval_categories" add constraint "payroll_approval_categories_pkey" PRIMARY KEY using index "payroll_approval_categories_pkey";
  END IF;
END $$;

alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_attendance_records" validate constraint "ippms_attendance_records_employee_id_fkey";

alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_payrun_id_fkey" FOREIGN KEY (payrun_id) REFERENCES public.pay_runs(id) ON DELETE SET NULL not valid;

alter table "ippms"."ippms_attendance_records" validate constraint "ippms_attendance_records_payrun_id_fkey";

alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_attendance_records" validate constraint "ippms_attendance_records_project_id_fkey";

alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES auth.users(id) not valid;

alter table "ippms"."ippms_attendance_records" validate constraint "ippms_attendance_records_recorded_by_fkey";

alter table "ippms"."ippms_attendance_records" add constraint "ippms_attendance_records_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES ippms.ippms_shifts(id) not valid;

alter table "ippms"."ippms_attendance_records" validate constraint "ippms_attendance_records_shift_id_fkey";

alter table "ippms"."ippms_employee_shifts" add constraint "ippms_employee_shifts_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_employee_shifts" validate constraint "ippms_employee_shifts_employee_id_fkey";

alter table "ippms"."ippms_employee_shifts" add constraint "ippms_employee_shifts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_employee_shifts" validate constraint "ippms_employee_shifts_project_id_fkey";

alter table "ippms"."ippms_employee_shifts" add constraint "ippms_employee_shifts_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES ippms.ippms_shifts(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_employee_shifts" validate constraint "ippms_employee_shifts_shift_id_fkey";

alter table "ippms"."ippms_employee_shifts" add constraint "uniq_shift_assignment" UNIQUE using index "uniq_shift_assignment";

alter table "ippms"."ippms_holidays" add constraint "ippms_holidays_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "ippms"."ippms_holidays" validate constraint "ippms_holidays_project_id_fkey";

alter table "ippms"."ippms_holidays" add constraint "uniq_holiday_per_project" UNIQUE using index "uniq_holiday_per_project";

alter table "ippms"."ippms_leave_requests" add constraint "ippms_leave_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "ippms"."ippms_leave_requests" validate constraint "ippms_leave_requests_approved_by_fkey";

alter table "ippms"."ippms_leave_requests" add constraint "ippms_leave_requests_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_leave_requests" validate constraint "ippms_leave_requests_employee_id_fkey";

alter table "ippms"."ippms_leave_requests" add constraint "ippms_leave_requests_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES ippms.ippms_leave_types(id) ON DELETE RESTRICT not valid;

alter table "ippms"."ippms_leave_requests" validate constraint "ippms_leave_requests_leave_type_id_fkey";

alter table "ippms"."ippms_leave_requests" add constraint "ippms_leave_requests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_leave_requests" validate constraint "ippms_leave_requests_project_id_fkey";

alter table "ippms"."ippms_leave_requests" add constraint "leave_date_range" CHECK ((end_date >= start_date)) not valid;

alter table "ippms"."ippms_leave_requests" validate constraint "leave_date_range";

alter table "ippms"."ippms_leave_types" add constraint "uniq_leave_code" UNIQUE using index "uniq_leave_code";

alter table "ippms"."ippms_piece_work_catalogue" add constraint "uniq_piece_catalogue_code" UNIQUE using index "uniq_piece_catalogue_code";

alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_piece_work_entries" validate constraint "ippms_piece_work_entries_employee_id_fkey";

alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_payrun_id_fkey" FOREIGN KEY (payrun_id) REFERENCES public.pay_runs(id) ON DELETE SET NULL not valid;

alter table "ippms"."ippms_piece_work_entries" validate constraint "ippms_piece_work_entries_payrun_id_fkey";

alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_piece_id_fkey" FOREIGN KEY (piece_id) REFERENCES ippms.ippms_piece_work_catalogue(id) ON DELETE RESTRICT not valid;

alter table "ippms"."ippms_piece_work_entries" validate constraint "ippms_piece_work_entries_piece_id_fkey";

alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_piece_work_entries" validate constraint "ippms_piece_work_entries_project_id_fkey";

alter table "ippms"."ippms_piece_work_entries" add constraint "ippms_piece_work_entries_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES auth.users(id) not valid;

alter table "ippms"."ippms_piece_work_entries" validate constraint "ippms_piece_work_entries_recorded_by_fkey";

alter table "ippms"."ippms_piece_work_rates" add constraint "ippms_piece_work_rates_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_piece_work_rates" validate constraint "ippms_piece_work_rates_employee_id_fkey";

alter table "ippms"."ippms_piece_work_rates" add constraint "ippms_piece_work_rates_piece_id_fkey" FOREIGN KEY (piece_id) REFERENCES ippms.ippms_piece_work_catalogue(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_piece_work_rates" validate constraint "ippms_piece_work_rates_piece_id_fkey";

alter table "ippms"."ippms_piece_work_rates" add constraint "ippms_piece_work_rates_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_piece_work_rates" validate constraint "ippms_piece_work_rates_project_id_fkey";

alter table "ippms"."ippms_piece_work_rates" add constraint "uniq_piece_rate_window" UNIQUE using index "uniq_piece_rate_window";

alter table "ippms"."ippms_shifts" add constraint "ippms_shifts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_shifts" validate constraint "ippms_shifts_project_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_attendance_id_fkey" FOREIGN KEY (attendance_id) REFERENCES ippms.ippms_attendance_records(id) not valid;

alter table "ippms"."ippms_work_days" validate constraint "ippms_work_days_attendance_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_work_days" validate constraint "ippms_work_days_employee_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_payrun_id_fkey" FOREIGN KEY (payrun_id) REFERENCES public.pay_runs(id) ON DELETE SET NULL not valid;

alter table "ippms"."ippms_work_days" validate constraint "ippms_work_days_payrun_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_piece_entry_id_fkey" FOREIGN KEY (piece_entry_id) REFERENCES ippms.ippms_piece_work_entries(id) not valid;

alter table "ippms"."ippms_work_days" validate constraint "ippms_work_days_piece_entry_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "ippms_work_days_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "ippms"."ippms_work_days" validate constraint "ippms_work_days_project_id_fkey";

alter table "ippms"."ippms_work_days" add constraint "uniq_work_day" UNIQUE using index "uniq_work_day";

alter table "public"."access_grants" add constraint "access_grants_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_company_id_fkey";

alter table "public"."access_grants" add constraint "access_grants_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."access_grants" validate constraint "access_grants_created_by_fkey";

alter table "public"."access_grants" add constraint "access_grants_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_org_id_fkey";

alter table "public"."access_grants" add constraint "access_grants_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.org_roles(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_role_id_fkey";

alter table "public"."access_grants" add constraint "access_grants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."access_grants" validate constraint "access_grants_user_id_fkey";

alter table "public"."activity_logs" add constraint "activity_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."activity_logs" validate constraint "activity_logs_organization_id_fkey";

alter table "public"."activity_logs" add constraint "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."activity_logs" validate constraint "activity_logs_user_id_fkey";

alter table "public"."approval_workflow_steps" add constraint "approval_workflow_steps_approver_user_id_fkey" FOREIGN KEY (approver_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."approval_workflow_steps" validate constraint "approval_workflow_steps_approver_user_id_fkey";

alter table "public"."approval_workflow_steps" add constraint "approval_workflow_steps_fallback_user_id_fkey" FOREIGN KEY (fallback_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."approval_workflow_steps" validate constraint "approval_workflow_steps_fallback_user_id_fkey";

alter table "public"."approval_workflow_steps" add constraint "approval_workflow_steps_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_steps" validate constraint "approval_workflow_steps_workflow_id_fkey";

alter table "public"."approval_workflow_steps" add constraint "approval_workflow_steps_workflow_id_level_key" UNIQUE using index "approval_workflow_steps_workflow_id_level_key";

alter table "public"."approval_workflows" add constraint "approval_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."approval_workflows" validate constraint "approval_workflows_created_by_fkey";

alter table "public"."auth_events" add constraint "auth_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."auth_events" validate constraint "auth_events_user_id_fkey";

alter table "public"."companies" add constraint "companies_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."companies" validate constraint "companies_organization_id_fkey";

alter table "public"."companies" add constraint "fk_companies_org" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."companies" validate constraint "fk_companies_org";

alter table "public"."company_unit_categories" add constraint "company_unit_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.employee_categories(id) ON DELETE CASCADE not valid;

alter table "public"."company_unit_categories" validate constraint "company_unit_categories_category_id_fkey";

alter table "public"."company_unit_categories" add constraint "company_unit_categories_company_unit_id_category_id_key" UNIQUE using index "company_unit_categories_company_unit_id_category_id_key";

alter table "public"."company_unit_categories" add constraint "company_unit_categories_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) ON DELETE CASCADE not valid;

alter table "public"."company_unit_categories" validate constraint "company_unit_categories_company_unit_id_fkey";

alter table "public"."company_units" add constraint "company_units_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.employee_categories(id) not valid;

alter table "public"."company_units" validate constraint "company_units_category_id_fkey";

alter table "public"."company_units" add constraint "fk_company_units_company" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_units" validate constraint "fk_company_units_company";

alter table "public"."company_units" add constraint "org_units_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_units" validate constraint "org_units_company_id_fkey";

alter table "public"."contract_templates" add constraint "contract_templates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."contract_templates" validate constraint "contract_templates_organization_id_fkey";

alter table "public"."contractor_pay_run_items" add constraint "contractor_pay_run_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."contractor_pay_run_items" validate constraint "contractor_pay_run_items_employee_id_fkey";

alter table "public"."contractor_pay_run_items" add constraint "contractor_pay_run_items_pay_run_id_employee_id_key" UNIQUE using index "contractor_pay_run_items_pay_run_id_employee_id_key";

alter table "public"."contractor_pay_run_items" add constraint "contractor_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."contractor_pay_run_items" validate constraint "contractor_pay_run_items_pay_run_id_fkey";

alter table "public"."countries" add constraint "countries_code_key" UNIQUE using index "countries_code_key";

alter table "public"."email_templates" add constraint "email_templates_event_key_fkey" FOREIGN KEY (event_key) REFERENCES public.email_events(key) not valid;

alter table "public"."email_templates" validate constraint "email_templates_event_key_fkey";

alter table "public"."email_templates" add constraint "email_templates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."email_templates" validate constraint "email_templates_updated_by_fkey";

alter table "public"."email_triggers" add constraint "email_triggers_event_key_fkey" FOREIGN KEY (event_key) REFERENCES public.email_events(key) not valid;

alter table "public"."email_triggers" validate constraint "email_triggers_event_key_fkey";

alter table "public"."email_triggers" add constraint "email_triggers_org_id_event_key_key" UNIQUE using index "email_triggers_org_id_event_key_key";

alter table "public"."email_triggers" add constraint "email_triggers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."email_triggers" validate constraint "email_triggers_updated_by_fkey";

alter table "public"."employee_categories" add constraint "employee_categories_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_categories" validate constraint "employee_categories_organization_id_fkey";

alter table "public"."employee_categories" add constraint "employee_categories_organization_id_key_key" UNIQUE using index "employee_categories_organization_id_key_key";

alter table "public"."employee_contracts" add constraint "employee_contracts_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_contracts" validate constraint "employee_contracts_employee_id_fkey";

alter table "public"."employee_contracts" add constraint "employee_contracts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_contracts" validate constraint "employee_contracts_organization_id_fkey";

alter table "public"."employee_contracts" add constraint "employee_contracts_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.contract_templates(id) ON DELETE SET NULL not valid;

alter table "public"."employee_contracts" validate constraint "employee_contracts_template_id_fkey";

alter table "public"."employee_types" add constraint "employee_types_name_key" UNIQUE using index "employee_types_name_key";

alter table "public"."employees" add constraint "check_employees_category" CHECK (((employee_category IS NULL) OR (employee_category = ANY (ARRAY['Intern'::text, 'Trainee'::text, 'Temporary'::text, 'Permanent'::text, 'On Contract'::text, 'Casual'::text])))) not valid;

alter table "public"."employees" validate constraint "check_employees_category";

alter table "public"."employees" add constraint "check_employees_status" CHECK ((employment_status = ANY (ARRAY['Active'::text, 'Terminated'::text, 'Deceased'::text, 'Resigned'::text, 'Probation'::text, 'Notice Period'::text]))) not valid;

alter table "public"."employees" validate constraint "check_employees_status";

alter table "public"."employees" add constraint "employees_category_check" CHECK (((category = ANY (ARRAY['head_office'::text, 'projects'::text])) OR (category IS NULL))) not valid;

alter table "public"."employees" validate constraint "employees_category_check";

alter table "public"."employees" add constraint "employees_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_company_id_fkey";

alter table "public"."employees" add constraint "employees_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_company_unit_id_fkey";

alter table "public"."employees" add constraint "employees_contract_type_check" CHECK ((contract_type = ANY (ARRAY['monthly'::text, 'variable'::text]))) not valid;

alter table "public"."employees" validate constraint "employees_contract_type_check";

alter table "public"."employees" add constraint "employees_department_id_fkey" FOREIGN KEY (sub_department_id) REFERENCES public.sub_departments(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_department_id_fkey";

alter table "public"."employees" add constraint "employees_employee_type_check" CHECK ((((category = 'head_office'::text) AND (employee_type = ANY (ARRAY['regular'::text, 'expatriate'::text, 'interns'::text]))) OR ((category = 'projects'::text) AND (employee_type = ANY (ARRAY['manpower'::text, 'ippms'::text, 'expatriate'::text]))) OR ((category IS NULL) AND (employee_type IS NULL)))) not valid;

alter table "public"."employees" validate constraint "employees_employee_type_check";

alter table "public"."employees" add constraint "employees_employee_type_id_fkey" FOREIGN KEY (employee_type_id) REFERENCES public.employee_types(id) not valid;

alter table "public"."employees" validate constraint "employees_employee_type_id_fkey";

alter table "public"."employees" add constraint "employees_pay_frequency_check" CHECK (((pay_frequency = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text])) OR (pay_frequency IS NULL))) not valid;

alter table "public"."employees" validate constraint "employees_pay_frequency_check";

alter table "public"."employees" add constraint "employees_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_project_id_fkey";

alter table "public"."employees" add constraint "fk_employees_company" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "fk_employees_company";

alter table "public"."employees" add constraint "fk_employees_org" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "fk_employees_org";

alter table "public"."employees" add constraint "fk_employees_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "fk_employees_organization";

alter table "public"."expatriate_pay_groups" add constraint "fk_expatriate_pay_groups_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_groups" validate constraint "fk_expatriate_pay_groups_organization";

alter table "public"."expatriate_pay_run_item_allowances" add constraint "expatriate_pay_run_item_allowan_expatriate_pay_run_item_id_fkey" FOREIGN KEY (expatriate_pay_run_item_id) REFERENCES public.expatriate_pay_run_items(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_item_allowances" validate constraint "expatriate_pay_run_item_allowan_expatriate_pay_run_item_id_fkey";

alter table "public"."expatriate_pay_run_item_allowances" add constraint "expatriate_pay_run_item_allowances_item_id_fkey" FOREIGN KEY (expatriate_pay_run_item_id) REFERENCES public.expatriate_pay_run_items(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_item_allowances" validate constraint "expatriate_pay_run_item_allowances_item_id_fkey";

alter table "public"."expatriate_pay_run_items" add constraint "fk_expatriate_pay_run_items_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_items" validate constraint "fk_expatriate_pay_run_items_organization";

alter table "public"."head_office_pay_group_company_units" add constraint "head_office_pay_group_company_units_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) not valid;

alter table "public"."head_office_pay_group_company_units" validate constraint "head_office_pay_group_company_units_company_unit_id_fkey";

alter table "public"."head_office_pay_group_members" add constraint "head_office_pay_group_members_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_group_members" validate constraint "head_office_pay_group_members_added_by_fkey";

alter table "public"."head_office_pay_group_members" add constraint "head_office_pay_group_members_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."head_office_pay_group_members" validate constraint "head_office_pay_group_members_employee_id_fkey";

alter table "public"."head_office_pay_groups_expatriates" add constraint "head_office_pay_groups_expatriates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."head_office_pay_groups_expatriates" validate constraint "head_office_pay_groups_expatriates_company_id_fkey";

alter table "public"."head_office_pay_groups_expatriates" add constraint "head_office_pay_groups_expatriates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_groups_expatriates" validate constraint "head_office_pay_groups_expatriates_created_by_fkey";

alter table "public"."head_office_pay_groups_expatriates" add constraint "head_office_pay_groups_expatriates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."head_office_pay_groups_expatriates" validate constraint "head_office_pay_groups_expatriates_organization_id_fkey";

alter table "public"."head_office_pay_groups_interns" add constraint "head_office_pay_groups_interns_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."head_office_pay_groups_interns" validate constraint "head_office_pay_groups_interns_company_id_fkey";

alter table "public"."head_office_pay_groups_interns" add constraint "head_office_pay_groups_interns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_groups_interns" validate constraint "head_office_pay_groups_interns_created_by_fkey";

alter table "public"."head_office_pay_groups_interns" add constraint "head_office_pay_groups_interns_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."head_office_pay_groups_interns" validate constraint "head_office_pay_groups_interns_organization_id_fkey";

alter table "public"."head_office_pay_groups_regular" add constraint "head_office_pay_groups_regular_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."head_office_pay_groups_regular" validate constraint "head_office_pay_groups_regular_company_id_fkey";

alter table "public"."head_office_pay_groups_regular" add constraint "head_office_pay_groups_regular_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_groups_regular" validate constraint "head_office_pay_groups_regular_created_by_fkey";

alter table "public"."head_office_pay_groups_regular" add constraint "head_office_pay_groups_regular_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."head_office_pay_groups_regular" validate constraint "head_office_pay_groups_regular_organization_id_fkey";

alter table "public"."head_office_pay_run_items" add constraint "head_office_pay_run_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."head_office_pay_run_items" validate constraint "head_office_pay_run_items_employee_id_fkey";

alter table "public"."head_office_pay_run_items" add constraint "head_office_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.head_office_pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."head_office_pay_run_items" validate constraint "head_office_pay_run_items_pay_run_id_fkey";

alter table "public"."head_office_pay_runs" add constraint "head_office_pay_runs_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_runs" validate constraint "head_office_pay_runs_approved_by_fkey";

alter table "public"."head_office_pay_runs" add constraint "head_office_pay_runs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."head_office_pay_runs" validate constraint "head_office_pay_runs_created_by_fkey";

alter table "public"."head_office_pay_runs" add constraint "head_office_pay_runs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."head_office_pay_runs" validate constraint "head_office_pay_runs_organization_id_fkey";

alter table "public"."head_office_pay_runs" add constraint "head_office_pay_runs_pay_run_id_key" UNIQUE using index "head_office_pay_runs_pay_run_id_key";

alter table "public"."impersonation_logs" add constraint "impersonation_logs_super_admin_id_fkey" FOREIGN KEY (super_admin_id) REFERENCES auth.users(id) not valid;

alter table "public"."impersonation_logs" validate constraint "impersonation_logs_super_admin_id_fkey";

alter table "public"."impersonation_logs" add constraint "impersonation_logs_target_organization_id_fkey" FOREIGN KEY (target_organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."impersonation_logs" validate constraint "impersonation_logs_target_organization_id_fkey";

alter table "public"."impersonation_logs" add constraint "impersonation_logs_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id) not valid;

alter table "public"."impersonation_logs" validate constraint "impersonation_logs_target_user_id_fkey";

alter table "public"."intern_pay_run_items" add constraint "intern_pay_run_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."intern_pay_run_items" validate constraint "intern_pay_run_items_employee_id_fkey";

alter table "public"."intern_pay_run_items" add constraint "intern_pay_run_items_mentor_id_fkey" FOREIGN KEY (mentor_id) REFERENCES public.employees(id) not valid;

alter table "public"."intern_pay_run_items" validate constraint "intern_pay_run_items_mentor_id_fkey";

alter table "public"."intern_pay_run_items" add constraint "intern_pay_run_items_pay_run_id_employee_id_key" UNIQUE using index "intern_pay_run_items_pay_run_id_employee_id_key";

alter table "public"."intern_pay_run_items" add constraint "intern_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."intern_pay_run_items" validate constraint "intern_pay_run_items_pay_run_id_fkey";

alter table "public"."items_catalog" add constraint "items_catalog_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."items_catalog" validate constraint "items_catalog_organization_id_fkey";

alter table "public"."items_catalog" add constraint "items_catalog_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."items_catalog" validate constraint "items_catalog_project_id_fkey";

alter table "public"."local_pay_run_items" add constraint "local_pay_run_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."local_pay_run_items" validate constraint "local_pay_run_items_employee_id_fkey";

alter table "public"."local_pay_run_items" add constraint "local_pay_run_items_pay_run_id_employee_id_key" UNIQUE using index "local_pay_run_items_pay_run_id_employee_id_key";

alter table "public"."local_pay_run_items" add constraint "local_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."local_pay_run_items" validate constraint "local_pay_run_items_pay_run_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."org_license_assignments" add constraint "org_license_assignments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."org_license_assignments" validate constraint "org_license_assignments_created_by_fkey";

alter table "public"."org_license_assignments" add constraint "org_license_assignments_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_license_assignments" validate constraint "org_license_assignments_org_id_fkey";

alter table "public"."org_license_assignments" add constraint "org_license_assignments_org_id_user_id_key" UNIQUE using index "org_license_assignments_org_id_user_id_key";

alter table "public"."org_license_assignments" add constraint "org_license_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."org_license_assignments" validate constraint "org_license_assignments_user_id_fkey";

alter table "public"."org_licenses" add constraint "org_licenses_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_licenses" validate constraint "org_licenses_org_id_fkey";

alter table "public"."org_roles" add constraint "org_roles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_roles" validate constraint "org_roles_org_id_fkey";

alter table "public"."org_roles" add constraint "org_roles_org_id_key_key" UNIQUE using index "org_roles_org_id_key_key";

alter table "public"."org_settings" add constraint "org_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.pay_groups(id) ON DELETE CASCADE not valid;

alter table "public"."org_settings" validate constraint "org_settings_org_id_fkey";

alter table "public"."org_settings" add constraint "org_settings_organization_id_key" UNIQUE using index "org_settings_organization_id_key";

alter table "public"."org_user_roles" add constraint "org_user_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."org_user_roles" validate constraint "org_user_roles_created_by_fkey";

alter table "public"."org_user_roles" add constraint "org_user_roles_org_user_id_fkey" FOREIGN KEY (org_user_id) REFERENCES public.org_users(id) ON DELETE CASCADE not valid;

alter table "public"."org_user_roles" validate constraint "org_user_roles_org_user_id_fkey";

alter table "public"."org_user_roles" add constraint "org_user_roles_org_user_id_role_id_key" UNIQUE using index "org_user_roles_org_user_id_role_id_key";

alter table "public"."org_user_roles" add constraint "org_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.org_roles(id) ON DELETE CASCADE not valid;

alter table "public"."org_user_roles" validate constraint "org_user_roles_role_id_fkey";

alter table "public"."org_users" add constraint "org_users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."org_users" validate constraint "org_users_created_by_fkey";

alter table "public"."org_users" add constraint "org_users_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_users" validate constraint "org_users_org_id_fkey";

alter table "public"."org_users" add constraint "org_users_org_id_user_id_key" UNIQUE using index "org_users_org_id_user_id_key";

alter table "public"."org_users" add constraint "org_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."org_users" validate constraint "org_users_user_id_fkey";

alter table "public"."organization_security_settings" add constraint "organization_security_settings_org_id_key" UNIQUE using index "organization_security_settings_org_id_key";

alter table "public"."organizations" add constraint "organizations_default_company_id_fkey" FOREIGN KEY (default_company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."organizations" validate constraint "organizations_default_company_id_fkey";

alter table "public"."pay_group_master" add constraint "pay_group_master_category_check" CHECK ((category = ANY (ARRAY['head_office'::text, 'projects'::text]))) not valid;

alter table "public"."pay_group_master" validate constraint "pay_group_master_category_check";

alter table "public"."pay_group_master" add constraint "pay_group_master_pay_frequency_check" CHECK (((pay_frequency = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text])) OR (pay_frequency IS NULL))) not valid;

alter table "public"."pay_group_master" validate constraint "pay_group_master_pay_frequency_check";

alter table "public"."pay_groups" add constraint "check_category_employee_type" CHECK ((((category = 'head_office'::text) AND (employee_type = ANY (ARRAY['regular'::text, 'expatriate'::text, 'interns'::text]))) OR ((category = 'projects'::text) AND (employee_type = ANY (ARRAY['manpower'::text, 'ippms'::text, 'expatriate'::text]))) OR ((category IS NULL) AND (employee_type IS NULL)))) not valid;

alter table "public"."pay_groups" validate constraint "check_category_employee_type";

alter table "public"."pay_groups" add constraint "check_category_sub_type" CHECK ((((category = 'head_office'::text) AND (employee_type = ANY (ARRAY['regular'::text, 'expatriate'::text, 'interns'::text]))) OR ((category = 'projects'::text) AND (employee_type = ANY (ARRAY['manpower'::text, 'ippms'::text, 'expatriate'::text]))) OR ((category IS NULL) AND (employee_type IS NULL)))) not valid;

alter table "public"."pay_groups" validate constraint "check_category_sub_type";

alter table "public"."pay_groups" add constraint "check_ippms_pay_type" CHECK ((((employee_type = 'ippms'::text) AND (pay_type = ANY (ARRAY['piece_rate'::text, 'daily_rate'::text]))) OR (employee_type IS DISTINCT FROM 'ippms'::text))) not valid;

alter table "public"."pay_groups" validate constraint "check_ippms_pay_type";

alter table "public"."pay_groups" add constraint "check_pay_frequency" CHECK ((((employee_type = 'manpower'::text) AND (pay_frequency = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text]))) OR ((employee_type <> 'manpower'::text) AND (pay_frequency IS NULL)))) not valid;

alter table "public"."pay_groups" validate constraint "check_pay_frequency";

alter table "public"."pay_groups" add constraint "fk_pay_groups_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pay_groups" validate constraint "fk_pay_groups_organization";

alter table "public"."pay_groups" add constraint "pay_groups_category_check" CHECK ((category = ANY (ARRAY['head_office'::text, 'projects'::text]))) not valid;

alter table "public"."pay_groups" validate constraint "pay_groups_category_check";

alter table "public"."pay_groups" add constraint "pay_groups_pay_frequency_check" CHECK (((pay_frequency = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text, 'weekly'::text, 'biweekly'::text, 'custom'::text, 'Daily Rate'::text, 'Monthly'::text])) OR (pay_frequency IS NULL))) not valid;

alter table "public"."pay_groups" validate constraint "pay_groups_pay_frequency_check";

alter table "public"."pay_groups" add constraint "pay_groups_pay_type_check" CHECK ((pay_type = ANY (ARRAY['hourly'::text, 'salary'::text, 'piece_rate'::text, 'daily_rate'::text]))) not valid;

alter table "public"."pay_groups" validate constraint "pay_groups_pay_type_check";

alter table "public"."pay_groups" add constraint "pay_groups_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."pay_groups" validate constraint "pay_groups_project_id_fkey";

alter table "public"."pay_groups" add constraint "pay_groups_project_type_check" CHECK (((project_type IS NULL) OR (project_type = ANY (ARRAY['manpower'::text, 'ippms'::text, 'expatriate'::text])))) not valid;

alter table "public"."pay_groups" validate constraint "pay_groups_project_type_check";

alter table "public"."pay_items" add constraint "fk_pay_items_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pay_items" validate constraint "fk_pay_items_organization";

alter table "public"."pay_runs" add constraint "fk_pay_runs_company" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."pay_runs" validate constraint "fk_pay_runs_company";

alter table "public"."pay_runs" add constraint "fk_pay_runs_org" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pay_runs" validate constraint "fk_pay_runs_org";

alter table "public"."pay_runs" add constraint "fk_pay_runs_organization" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pay_runs" validate constraint "fk_pay_runs_organization";

alter table "public"."pay_runs" add constraint "pay_runs_approval_status_check" CHECK ((approval_status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'rejected'::text, 'locked'::text]))) not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_approval_status_check";

alter table "public"."pay_runs" add constraint "pay_runs_approval_submitted_by_fkey" FOREIGN KEY (approval_submitted_by) REFERENCES auth.users(id) not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_approval_submitted_by_fkey";

alter table "public"."pay_runs" add constraint "pay_runs_category_check" CHECK ((category = ANY (ARRAY['head_office'::text, 'projects'::text]))) not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_category_check";

alter table "public"."pay_runs" add constraint "pay_runs_pay_frequency_check" CHECK (((pay_frequency = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text])) OR (pay_frequency IS NULL))) not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_pay_frequency_check";

alter table "public"."pay_runs" add constraint "pay_runs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_project_id_fkey";

alter table "public"."paygroup_employees" add constraint "paygroup_employees_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."paygroup_employees" validate constraint "paygroup_employees_assigned_by_fkey";

alter table "public"."paygroup_employees" add constraint "paygroup_employees_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."paygroup_employees" validate constraint "paygroup_employees_employee_id_fkey";

alter table "public"."paygroup_employees" add constraint "paygroup_employees_employee_id_key" UNIQUE using index "paygroup_employees_employee_id_key";

alter table "public"."paygroup_employees" add constraint "paygroup_employees_pay_group_master_id_fkey" FOREIGN KEY (pay_group_master_id) REFERENCES public.pay_group_master(id) ON DELETE CASCADE not valid;

alter table "public"."paygroup_employees" validate constraint "paygroup_employees_pay_group_master_id_fkey";

alter table "public"."paygroup_employees" add constraint "unique_employee_in_paygroup" UNIQUE using index "unique_employee_in_paygroup";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_override_by_fkey" FOREIGN KEY (override_by) REFERENCES auth.users(id) not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_override_by_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_payrun_id_level_key" UNIQUE using index "payrun_approval_steps_payrun_id_level_key";

alter table "public"."payrun_employees" add constraint "payrun_employees_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_employees" validate constraint "payrun_employees_employee_id_fkey";

alter table "public"."payrun_employees" add constraint "payrun_employees_pay_group_id_fkey" FOREIGN KEY (pay_group_id) REFERENCES public.pay_groups(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_employees" validate constraint "payrun_employees_pay_group_id_fkey";

alter table "public"."payrun_employees" add constraint "payrun_employees_pay_run_id_employee_id_key" UNIQUE using index "payrun_employees_pay_run_id_employee_id_key";

alter table "public"."payrun_employees" add constraint "payrun_employees_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_employees" validate constraint "payrun_employees_pay_run_id_fkey";

alter table "public"."platform_admin_devices" add constraint "platform_admin_devices_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON DELETE CASCADE not valid;

alter table "public"."platform_admin_devices" validate constraint "platform_admin_devices_admin_id_fkey";

alter table "public"."platform_admin_devices" add constraint "platform_admin_devices_device_id_key" UNIQUE using index "platform_admin_devices_device_id_key";

alter table "public"."platform_email_settings" add constraint "platform_email_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."platform_email_settings" validate constraint "platform_email_settings_updated_by_fkey";

alter table "public"."probation_reminder_logs" add constraint "probation_reminder_logs_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."probation_reminder_logs" validate constraint "probation_reminder_logs_employee_id_fkey";

alter table "public"."probation_reminder_logs" add constraint "probation_reminder_logs_employee_id_reminder_type_key" UNIQUE using index "probation_reminder_logs_employee_id_reminder_type_key";

alter table "public"."probation_reminder_logs" add constraint "probation_reminder_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."probation_reminder_logs" validate constraint "probation_reminder_logs_organization_id_fkey";

alter table "public"."project_onboarding_steps" add constraint "project_onboarding_steps_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_onboarding_steps" validate constraint "project_onboarding_steps_project_id_fkey";

alter table "public"."project_onboarding_steps" add constraint "project_onboarding_steps_project_id_step_key_key" UNIQUE using index "project_onboarding_steps_project_id_step_key_key";

alter table "public"."projects" add constraint "projects_code_key" UNIQUE using index "projects_code_key";

alter table "public"."projects" add constraint "projects_name_key" UNIQUE using index "projects_name_key";

alter table "public"."projects" add constraint "projects_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_organization_id_fkey";

alter table "public"."rbac_grants" add constraint "rbac_grants_check" CHECK ((((user_id IS NOT NULL) AND (role_code IS NULL)) OR ((user_id IS NULL) AND (role_code IS NOT NULL)))) not valid;

alter table "public"."rbac_grants" validate constraint "rbac_grants_check";

alter table "public"."rbac_grants" add constraint "rbac_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."rbac_grants" validate constraint "rbac_grants_granted_by_fkey";

alter table "public"."reminder_rules" add constraint "reminder_rules_rule_type_check" CHECK ((rule_type = ANY (ARRAY['probation_expiry'::text, 'contract_expiry'::text, 'approval_reminder'::text]))) not valid;

alter table "public"."reminder_rules" validate constraint "reminder_rules_rule_type_check";

alter table "public"."sub_departments" add constraint "departments_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) ON DELETE CASCADE not valid;

alter table "public"."sub_departments" validate constraint "departments_company_unit_id_fkey";

alter table "public"."sub_departments" add constraint "departments_name_company_unit_id_key" UNIQUE using index "departments_name_company_unit_id_key";

alter table "public"."tenant_email_settings" add constraint "tenant_email_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."tenant_email_settings" validate constraint "tenant_email_settings_updated_by_fkey";

alter table "public"."timesheet_departments" add constraint "timesheet_departments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_departments" validate constraint "timesheet_departments_organization_id_fkey";

alter table "public"."timesheet_departments" add constraint "timesheet_departments_organization_id_name_key" UNIQUE using index "timesheet_departments_organization_id_name_key";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_employee_id_fkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_linked_pay_run_id_fkey" FOREIGN KEY (linked_pay_run_id) REFERENCES public.pay_runs(id) ON DELETE SET NULL not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_linked_pay_run_id_fkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_timesheet_id_fkey" FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE CASCADE not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_timesheet_id_fkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_timesheet_id_work_date_key" UNIQUE using index "timesheet_entries_timesheet_id_work_date_key";

alter table "public"."timesheets" add constraint "timesheets_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."timesheets" validate constraint "timesheets_employee_id_fkey";

alter table "public"."timesheets" add constraint "timesheets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."timesheets" validate constraint "timesheets_organization_id_fkey";

alter table "public"."timesheets" add constraint "timesheets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."timesheets" validate constraint "timesheets_project_id_fkey";

alter table "public"."user_company_memberships" add constraint "user_company_memberships_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."user_company_memberships" validate constraint "user_company_memberships_company_id_fkey";

alter table "public"."user_company_memberships" add constraint "user_company_memberships_user_id_company_id_key" UNIQUE using index "user_company_memberships_user_id_company_id_key";

alter table "public"."user_company_memberships" add constraint "user_company_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_company_memberships" validate constraint "user_company_memberships_user_id_fkey";

alter table "public"."user_invites" add constraint "user_invites_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) not valid;

alter table "public"."user_invites" validate constraint "user_invites_tenant_id_fkey";

alter table "public"."user_management_invitations" add constraint "user_management_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."user_management_invitations" validate constraint "user_management_invitations_invited_by_fkey";

alter table "public"."user_management_invitations" add constraint "user_management_invitations_token_key" UNIQUE using index "user_management_invitations_token_key";

alter table "public"."user_management_profiles" add constraint "user_management_profiles_user_id_key" UNIQUE using index "user_management_profiles_user_id_key";

alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_organization_id_fkey";

alter table "public"."variable_item_logs" add constraint "variable_item_logs_catalog_item_id_fkey" FOREIGN KEY (catalog_item_id) REFERENCES public.items_catalog(id) ON DELETE SET NULL not valid;

alter table "public"."variable_item_logs" validate constraint "variable_item_logs_catalog_item_id_fkey";

alter table "public"."variable_item_logs" add constraint "variable_item_logs_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."variable_item_logs" validate constraint "variable_item_logs_cycle_id_fkey";

alter table "public"."variable_item_logs" add constraint "variable_item_logs_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."variable_item_logs" validate constraint "variable_item_logs_employee_id_fkey";

alter table "public"."variable_item_logs" add constraint "variable_item_logs_work_log_id_fkey" FOREIGN KEY (work_log_id) REFERENCES public.variable_work_logs(id) ON DELETE CASCADE not valid;

alter table "public"."variable_item_logs" validate constraint "variable_item_logs_work_log_id_fkey";

alter table "public"."variable_pay_cycles" add constraint "variable_pay_cycles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."variable_pay_cycles" validate constraint "variable_pay_cycles_organization_id_fkey";

alter table "public"."variable_pay_cycles" add constraint "variable_pay_cycles_pay_group_id_fkey" FOREIGN KEY (pay_group_id) REFERENCES public.pay_groups(id) ON DELETE SET NULL not valid;

alter table "public"."variable_pay_cycles" validate constraint "variable_pay_cycles_pay_group_id_fkey";

alter table "public"."variable_pay_cycles" add constraint "variable_pay_cycles_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."variable_pay_cycles" validate constraint "variable_pay_cycles_project_id_fkey";

alter table "public"."variable_pay_summaries" add constraint "variable_pay_summaries_cycle_id_employee_id_key" UNIQUE using index "variable_pay_summaries_cycle_id_employee_id_key";

alter table "public"."variable_pay_summaries" add constraint "variable_pay_summaries_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."variable_pay_summaries" validate constraint "variable_pay_summaries_cycle_id_fkey";

alter table "public"."variable_pay_summaries" add constraint "variable_pay_summaries_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."variable_pay_summaries" validate constraint "variable_pay_summaries_employee_id_fkey";

alter table "public"."variable_work_logs" add constraint "variable_work_logs_cycle_id_employee_id_work_date_key" UNIQUE using index "variable_work_logs_cycle_id_employee_id_work_date_key";

alter table "public"."variable_work_logs" add constraint "variable_work_logs_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.variable_pay_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."variable_work_logs" validate constraint "variable_work_logs_cycle_id_fkey";

alter table "public"."variable_work_logs" add constraint "variable_work_logs_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."variable_work_logs" validate constraint "variable_work_logs_employee_id_fkey";

alter table "public"."alert_logs" add constraint "alert_logs_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id) ON DELETE CASCADE not valid;

alter table "public"."alert_logs" validate constraint "alert_logs_rule_id_fkey";

alter table "public"."anomaly_logs" add constraint "anomaly_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."anomaly_logs" validate constraint "anomaly_logs_organization_id_fkey";

alter table "public"."anomaly_logs" add constraint "anomaly_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."anomaly_logs" validate constraint "anomaly_logs_project_id_fkey";

alter table "public"."approval_group_members" add constraint "approval_group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.approval_groups(id) ON DELETE CASCADE not valid;

alter table "public"."approval_group_members" validate constraint "approval_group_members_group_id_fkey";

alter table "public"."approval_groups" add constraint "approval_groups_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."approval_groups" validate constraint "approval_groups_organization_id_fkey";

alter table "public"."approval_workflow_criteria" add constraint "approval_workflow_criteria_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_criteria" validate constraint "approval_workflow_criteria_workflow_id_fkey";

alter table "public"."approval_workflow_followups" add constraint "approval_workflow_followups_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_followups" validate constraint "approval_workflow_followups_workflow_id_fkey";

alter table "public"."approval_workflow_messages" add constraint "approval_workflow_messages_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_messages" validate constraint "approval_workflow_messages_workflow_id_fkey";

alter table "public"."approval_workflow_versions" add constraint "approval_workflow_versions_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_versions" validate constraint "approval_workflow_versions_workflow_id_fkey";

alter table "public"."attendance_daily_summary" add constraint "attendance_daily_summary_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_daily_summary" validate constraint "attendance_daily_summary_employee_id_fkey";

alter table "public"."attendance_daily_summary" add constraint "attendance_daily_summary_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_daily_summary" validate constraint "attendance_daily_summary_organization_id_fkey";

alter table "public"."attendance_daily_summary" add constraint "attendance_daily_summary_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."attendance_daily_summary" validate constraint "attendance_daily_summary_project_id_fkey";

alter table "public"."attendance_daily_summary" add constraint "attendance_daily_summary_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES public.attendance_shifts(id) not valid;

alter table "public"."attendance_daily_summary" validate constraint "attendance_daily_summary_shift_id_fkey";

alter table "public"."attendance_devices" add constraint "attendance_devices_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_devices" validate constraint "attendance_devices_employee_id_fkey";

alter table "public"."attendance_policies" add constraint "attendance_policies_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_policies" validate constraint "attendance_policies_company_id_fkey";

alter table "public"."attendance_policies" add constraint "attendance_policies_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_policies" validate constraint "attendance_policies_organization_id_fkey";

alter table "public"."attendance_records" add constraint "attendance_records_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_records" validate constraint "attendance_records_employee_id_fkey";

alter table "public"."attendance_regularization_requests" add constraint "attendance_regularization_requests_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_regularization_requests" validate constraint "attendance_regularization_requests_employee_id_fkey";

alter table "public"."attendance_regularization_requests" add constraint "attendance_regularization_requests_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_regularization_requests" validate constraint "attendance_regularization_requests_organization_id_fkey";

alter table "public"."attendance_shift_assignments" add constraint "attendance_shift_assignments_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_shift_assignments" validate constraint "attendance_shift_assignments_employee_id_fkey";

alter table "public"."attendance_shift_assignments" add constraint "attendance_shift_assignments_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES public.attendance_shifts(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_shift_assignments" validate constraint "attendance_shift_assignments_shift_id_fkey";

alter table "public"."attendance_shifts" add constraint "attendance_shifts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_shifts" validate constraint "attendance_shifts_organization_id_fkey";

alter table "public"."attendance_time_logs" add constraint "attendance_time_logs_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_time_logs" validate constraint "attendance_time_logs_employee_id_fkey";

alter table "public"."attendance_time_logs" add constraint "attendance_time_logs_geofence_id_fkey" FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE SET NULL not valid;

alter table "public"."attendance_time_logs" validate constraint "attendance_time_logs_geofence_id_fkey";

alter table "public"."attendance_time_logs" add constraint "attendance_time_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_time_logs" validate constraint "attendance_time_logs_organization_id_fkey";

alter table "public"."attendance_time_logs" add constraint "attendance_time_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."attendance_time_logs" validate constraint "attendance_time_logs_project_id_fkey";

alter table "public"."auth_events" add constraint "auth_events_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."auth_events" validate constraint "auth_events_org_id_fkey";

alter table "public"."designations" add constraint "designations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."designations" validate constraint "designations_organization_id_fkey";

alter table "public"."ehs_compliance_requirements" add constraint "ehs_compliance_requirements_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_compliance_requirements" validate constraint "ehs_compliance_requirements_organization_id_fkey";

alter table "public"."ehs_compliance_requirements" add constraint "ehs_compliance_requirements_responsible_person_fkey" FOREIGN KEY (responsible_person) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_compliance_requirements" validate constraint "ehs_compliance_requirements_responsible_person_fkey";

alter table "public"."ehs_corrective_actions" add constraint "ehs_corrective_actions_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_corrective_actions" validate constraint "ehs_corrective_actions_assigned_to_fkey";

alter table "public"."ehs_corrective_actions" add constraint "ehs_corrective_actions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_corrective_actions" validate constraint "ehs_corrective_actions_organization_id_fkey";

alter table "public"."ehs_corrective_actions" add constraint "ehs_corrective_actions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_corrective_actions" validate constraint "ehs_corrective_actions_project_id_fkey";

alter table "public"."ehs_corrective_actions" add constraint "ehs_corrective_actions_responsible_person_fkey" FOREIGN KEY (responsible_person) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_corrective_actions" validate constraint "ehs_corrective_actions_responsible_person_fkey";

alter table "public"."ehs_emergency_drills" add constraint "ehs_emergency_drills_conducted_by_fkey" FOREIGN KEY (conducted_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_emergency_drills" validate constraint "ehs_emergency_drills_conducted_by_fkey";

alter table "public"."ehs_emergency_drills" add constraint "ehs_emergency_drills_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_emergency_drills" validate constraint "ehs_emergency_drills_organization_id_fkey";

alter table "public"."ehs_emergency_drills" add constraint "ehs_emergency_drills_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_emergency_drills" validate constraint "ehs_emergency_drills_project_id_fkey";

alter table "public"."ehs_environmental_incidents" add constraint "ehs_environmental_incidents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_environmental_incidents" validate constraint "ehs_environmental_incidents_organization_id_fkey";

alter table "public"."ehs_environmental_incidents" add constraint "ehs_environmental_incidents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_environmental_incidents" validate constraint "ehs_environmental_incidents_project_id_fkey";

alter table "public"."ehs_environmental_incidents" add constraint "ehs_environmental_incidents_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_environmental_incidents" validate constraint "ehs_environmental_incidents_reported_by_fkey";

alter table "public"."ehs_hazards" add constraint "ehs_hazards_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_hazards" validate constraint "ehs_hazards_assigned_to_fkey";

alter table "public"."ehs_hazards" add constraint "ehs_hazards_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."ehs_hazards" validate constraint "ehs_hazards_company_id_fkey";

alter table "public"."ehs_hazards" add constraint "ehs_hazards_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_hazards" validate constraint "ehs_hazards_organization_id_fkey";

alter table "public"."ehs_hazards" add constraint "ehs_hazards_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_hazards" validate constraint "ehs_hazards_project_id_fkey";

alter table "public"."ehs_hazards" add constraint "ehs_hazards_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_hazards" validate constraint "ehs_hazards_reported_by_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_company_id_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_investigator_id_fkey" FOREIGN KEY (investigator_id) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_investigator_id_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_organization_id_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_project_id_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_reported_by_fkey";

alter table "public"."ehs_incidents" add constraint "ehs_incidents_supervisor_id_fkey" FOREIGN KEY (supervisor_id) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_incidents" validate constraint "ehs_incidents_supervisor_id_fkey";

alter table "public"."ehs_inspection_items" add constraint "ehs_inspection_items_auto_hazard_id_fkey" FOREIGN KEY (auto_hazard_id) REFERENCES public.ehs_hazards(id) not valid;

alter table "public"."ehs_inspection_items" validate constraint "ehs_inspection_items_auto_hazard_id_fkey";

alter table "public"."ehs_inspection_items" add constraint "ehs_inspection_items_inspection_id_fkey" FOREIGN KEY (inspection_id) REFERENCES public.ehs_inspections(id) ON DELETE CASCADE not valid;

alter table "public"."ehs_inspection_items" validate constraint "ehs_inspection_items_inspection_id_fkey";

alter table "public"."ehs_inspection_templates" add constraint "ehs_inspection_templates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_inspection_templates" validate constraint "ehs_inspection_templates_organization_id_fkey";

alter table "public"."ehs_inspections" add constraint "ehs_inspections_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."ehs_inspections" validate constraint "ehs_inspections_company_id_fkey";

alter table "public"."ehs_inspections" add constraint "ehs_inspections_inspector_id_fkey" FOREIGN KEY (inspector_id) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_inspections" validate constraint "ehs_inspections_inspector_id_fkey";

alter table "public"."ehs_inspections" add constraint "ehs_inspections_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_inspections" validate constraint "ehs_inspections_organization_id_fkey";

alter table "public"."ehs_inspections" add constraint "ehs_inspections_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_inspections" validate constraint "ehs_inspections_project_id_fkey";

alter table "public"."ehs_inspections" add constraint "ehs_inspections_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.ehs_inspection_templates(id) not valid;

alter table "public"."ehs_inspections" validate constraint "ehs_inspections_template_id_fkey";

alter table "public"."ehs_permits" add constraint "ehs_permits_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_permits" validate constraint "ehs_permits_approved_by_fkey";

alter table "public"."ehs_permits" add constraint "ehs_permits_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_permits" validate constraint "ehs_permits_organization_id_fkey";

alter table "public"."ehs_permits" add constraint "ehs_permits_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_permits" validate constraint "ehs_permits_project_id_fkey";

alter table "public"."ehs_permits" add constraint "ehs_permits_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_permits" validate constraint "ehs_permits_requested_by_fkey";

alter table "public"."ehs_ppe_records" add constraint "ehs_ppe_records_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_ppe_records" validate constraint "ehs_ppe_records_employee_id_fkey";

alter table "public"."ehs_ppe_records" add constraint "ehs_ppe_records_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_ppe_records" validate constraint "ehs_ppe_records_organization_id_fkey";

alter table "public"."ehs_ppe_records" add constraint "ehs_ppe_records_ppe_type_id_fkey" FOREIGN KEY (ppe_type_id) REFERENCES public.ehs_ppe_types(id) not valid;

alter table "public"."ehs_ppe_records" validate constraint "ehs_ppe_records_ppe_type_id_fkey";

alter table "public"."ehs_ppe_records" add constraint "ehs_ppe_records_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_ppe_records" validate constraint "ehs_ppe_records_project_id_fkey";

alter table "public"."ehs_ppe_types" add constraint "ehs_ppe_types_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_ppe_types" validate constraint "ehs_ppe_types_organization_id_fkey";

alter table "public"."ehs_risk_assessment_items" add constraint "ehs_risk_assessment_items_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES public.ehs_risk_assessments(id) ON DELETE CASCADE not valid;

alter table "public"."ehs_risk_assessment_items" validate constraint "ehs_risk_assessment_items_assessment_id_fkey";

alter table "public"."ehs_risk_assessment_items" add constraint "ehs_risk_assessment_items_responsible_person_fkey" FOREIGN KEY (responsible_person) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_risk_assessment_items" validate constraint "ehs_risk_assessment_items_responsible_person_fkey";

alter table "public"."ehs_risk_assessments" add constraint "ehs_risk_assessments_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_risk_assessments" validate constraint "ehs_risk_assessments_approved_by_fkey";

alter table "public"."ehs_risk_assessments" add constraint "ehs_risk_assessments_assessed_by_fkey" FOREIGN KEY (assessed_by) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_risk_assessments" validate constraint "ehs_risk_assessments_assessed_by_fkey";

alter table "public"."ehs_risk_assessments" add constraint "ehs_risk_assessments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) not valid;

alter table "public"."ehs_risk_assessments" validate constraint "ehs_risk_assessments_company_id_fkey";

alter table "public"."ehs_risk_assessments" add constraint "ehs_risk_assessments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_risk_assessments" validate constraint "ehs_risk_assessments_organization_id_fkey";

alter table "public"."ehs_risk_assessments" add constraint "ehs_risk_assessments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_risk_assessments" validate constraint "ehs_risk_assessments_project_id_fkey";

alter table "public"."ehs_training_records" add constraint "ehs_training_records_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."ehs_training_records" validate constraint "ehs_training_records_employee_id_fkey";

alter table "public"."ehs_training_records" add constraint "ehs_training_records_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."ehs_training_records" validate constraint "ehs_training_records_organization_id_fkey";

alter table "public"."ehs_training_records" add constraint "ehs_training_records_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ehs_training_records" validate constraint "ehs_training_records_project_id_fkey";

alter table "public"."employee_addresses" add constraint "employee_addresses_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_addresses" validate constraint "employee_addresses_employee_id_fkey";

alter table "public"."employee_addresses" add constraint "employee_addresses_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_addresses" validate constraint "employee_addresses_organization_id_fkey";

alter table "public"."employee_dependents" add constraint "employee_dependents_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_dependents" validate constraint "employee_dependents_employee_id_fkey";

alter table "public"."employee_dependents" add constraint "employee_dependents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_dependents" validate constraint "employee_dependents_organization_id_fkey";

alter table "public"."employee_documents" add constraint "employee_documents_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_documents" validate constraint "employee_documents_employee_id_fkey";

alter table "public"."employee_documents" add constraint "employee_documents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_documents" validate constraint "employee_documents_organization_id_fkey";

alter table "public"."employee_education" add constraint "employee_education_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_education" validate constraint "employee_education_employee_id_fkey";

alter table "public"."employee_education" add constraint "employee_education_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_education" validate constraint "employee_education_organization_id_fkey";

alter table "public"."employee_external_ids" add constraint "employee_external_ids_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_external_ids" validate constraint "employee_external_ids_employee_id_fkey";

alter table "public"."employee_external_ids" add constraint "employee_external_ids_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_external_ids" validate constraint "employee_external_ids_organization_id_fkey";

alter table "public"."employee_geofences" add constraint "employee_geofences_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_geofences" validate constraint "employee_geofences_employee_id_fkey";

alter table "public"."employee_geofences" add constraint "employee_geofences_geofence_id_fkey" FOREIGN KEY (geofence_id) REFERENCES public.geofences(id) ON DELETE CASCADE not valid;

alter table "public"."employee_geofences" validate constraint "employee_geofences_geofence_id_fkey";

alter table "public"."employee_number_history" add constraint "employee_number_history_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_number_history" validate constraint "employee_number_history_employee_id_fkey";

alter table "public"."employee_time_policies" add constraint "employee_time_policies_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_time_policies" validate constraint "employee_time_policies_employee_id_fkey";

alter table "public"."employee_work_experience" add constraint "employee_work_experience_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_work_experience" validate constraint "employee_work_experience_employee_id_fkey";

alter table "public"."employee_work_experience" add constraint "employee_work_experience_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."employee_work_experience" validate constraint "employee_work_experience_organization_id_fkey";

alter table "public"."employees" add constraint "employees_designation_id_fkey" FOREIGN KEY (designation_id) REFERENCES public.designations(id) not valid;

alter table "public"."employees" validate constraint "employees_designation_id_fkey";

alter table "public"."employees" add constraint "employees_pay_group_id_fkey" FOREIGN KEY (pay_group_id) REFERENCES public.pay_groups(id) not valid;

alter table "public"."employees" validate constraint "employees_pay_group_id_fkey";

alter table "public"."employees" add constraint "employees_reports_to_id_fkey" FOREIGN KEY (reports_to_id) REFERENCES public.employees(id) not valid;

alter table "public"."employees" validate constraint "employees_reports_to_id_fkey";

alter table "public"."expatriate_pay_run_items" add constraint "expatriate_pay_run_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_items" validate constraint "expatriate_pay_run_items_employee_id_fkey";

alter table "public"."expatriate_pay_run_items" add constraint "expatriate_pay_run_items_expatriate_pay_group_id_fkey" FOREIGN KEY (expatriate_pay_group_id) REFERENCES public.expatriate_pay_groups(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_items" validate constraint "expatriate_pay_run_items_expatriate_pay_group_id_fkey";

alter table "public"."expatriate_pay_run_items" add constraint "expatriate_pay_run_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."expatriate_pay_run_items" validate constraint "expatriate_pay_run_items_pay_run_id_fkey";

alter table "public"."geofences" add constraint "geofences_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."geofences" validate constraint "geofences_organization_id_fkey";

alter table "public"."integration_tokens" add constraint "integration_tokens_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integration_tokens" validate constraint "integration_tokens_organization_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" add constraint "ippms_daily_timesheet_entries_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."ippms_daily_timesheet_entries" validate constraint "ippms_daily_timesheet_entries_employee_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" add constraint "ippms_daily_timesheet_entries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ippms_daily_timesheet_entries" validate constraint "ippms_daily_timesheet_entries_organization_id_fkey";

alter table "public"."ippms_daily_timesheet_entries" add constraint "ippms_daily_timesheet_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."ippms_daily_timesheet_entries" validate constraint "ippms_daily_timesheet_entries_project_id_fkey";

alter table "public"."ippms_project_tasks" add constraint "ippms_project_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."ippms_project_tasks" validate constraint "ippms_project_tasks_project_id_fkey";

alter table "public"."locations" add constraint "locations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."locations" validate constraint "locations_organization_id_fkey";

alter table "public"."lst_employee_assignments" add constraint "lst_employee_assignments_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."lst_employee_assignments" validate constraint "lst_employee_assignments_employee_id_fkey";

alter table "public"."lst_employee_assignments" add constraint "lst_employee_assignments_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.lst_payment_plans(id) ON DELETE CASCADE not valid;

alter table "public"."lst_employee_assignments" validate constraint "lst_employee_assignments_plan_id_fkey";

alter table "public"."org_departments" add constraint "org_departments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_departments" validate constraint "org_departments_organization_id_fkey";

alter table "public"."org_departments" add constraint "org_departments_parent_department_id_fkey" FOREIGN KEY (parent_department_id) REFERENCES public.org_departments(id) ON DELETE SET NULL not valid;

alter table "public"."org_departments" validate constraint "org_departments_parent_department_id_fkey";

alter table "public"."organization_security_settings" add constraint "organization_security_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_security_settings" validate constraint "organization_security_settings_org_id_fkey";

alter table "public"."pay_calculation_audit_log" add constraint "pay_calculation_audit_log_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."pay_calculation_audit_log" validate constraint "pay_calculation_audit_log_employee_id_fkey";

alter table "public"."pay_calculation_audit_log" add constraint "pay_calculation_audit_log_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."pay_calculation_audit_log" validate constraint "pay_calculation_audit_log_pay_run_id_fkey";

alter table "public"."pay_group_master" add constraint "pay_group_master_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pay_group_master" validate constraint "pay_group_master_organization_id_fkey";

alter table "public"."pay_item_custom_deductions" add constraint "pay_item_custom_deductions_pay_item_id_fkey" FOREIGN KEY (pay_item_id) REFERENCES public.pay_items(id) ON DELETE CASCADE not valid;

alter table "public"."pay_item_custom_deductions" validate constraint "pay_item_custom_deductions_pay_item_id_fkey";

alter table "public"."pay_items" add constraint "pay_items_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "public"."pay_items" validate constraint "pay_items_employee_id_fkey";

alter table "public"."pay_items" add constraint "pay_items_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."pay_items" validate constraint "pay_items_pay_run_id_fkey";

alter table "public"."pay_runs" add constraint "pay_runs_pay_group_master_id_fkey" FOREIGN KEY (pay_group_master_id) REFERENCES public.pay_group_master(id) not valid;

alter table "public"."pay_runs" validate constraint "pay_runs_pay_group_master_id_fkey";

alter table "public"."payroll_approval_categories" add constraint "payroll_approval_categories_config_id_fkey" FOREIGN KEY (config_id) REFERENCES public.payroll_approval_configs(id) ON DELETE CASCADE not valid;

alter table "public"."payroll_approval_categories" validate constraint "payroll_approval_categories_config_id_fkey";

alter table "public"."payroll_approval_configs" add constraint "payroll_approval_configs_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) not valid;

alter table "public"."payroll_approval_configs" validate constraint "payroll_approval_configs_workflow_id_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_actioned_by_fkey" FOREIGN KEY (actioned_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_actioned_by_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_approver_user_id_fkey" FOREIGN KEY (approver_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_approver_user_id_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_delegated_by_fkey" FOREIGN KEY (delegated_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_delegated_by_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_original_approver_id_fkey" FOREIGN KEY (original_approver_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_original_approver_id_fkey";

alter table "public"."payrun_approval_steps" add constraint "payrun_approval_steps_payrun_id_fkey" FOREIGN KEY (payrun_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_approval_steps" validate constraint "payrun_approval_steps_payrun_id_fkey";

alter table "public"."payrun_approvals" add constraint "payrun_approvals_payrun_id_fkey" FOREIGN KEY (payrun_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_approvals" validate constraint "payrun_approvals_payrun_id_fkey";

alter table "public"."payrun_workflow_approvers" add constraint "payrun_workflow_approvers_approver_id_fkey" FOREIGN KEY (approver_id) REFERENCES public.users(id) not valid;

alter table "public"."payrun_workflow_approvers" validate constraint "payrun_workflow_approvers_approver_id_fkey";

alter table "public"."payrun_workflow_approvers" add constraint "payrun_workflow_approvers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE not valid;

alter table "public"."payrun_workflow_approvers" validate constraint "payrun_workflow_approvers_company_id_fkey";

alter table "public"."payslip_generations" add constraint "payslip_generations_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."payslip_generations" validate constraint "payslip_generations_employee_id_fkey";

alter table "public"."payslip_generations" add constraint "payslip_generations_pay_run_id_fkey" FOREIGN KEY (pay_run_id) REFERENCES public.pay_runs(id) ON DELETE CASCADE not valid;

alter table "public"."payslip_generations" validate constraint "payslip_generations_pay_run_id_fkey";

alter table "public"."payslip_generations" add constraint "payslip_generations_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.payslip_templates(id) ON DELETE CASCADE not valid;

alter table "public"."payslip_generations" validate constraint "payslip_generations_template_id_fkey";

alter table "public"."permission_cache" add constraint "permission_cache_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."permission_cache" validate constraint "permission_cache_user_id_fkey";

alter table "public"."platform_admins" add constraint "platform_admins_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."platform_admins" validate constraint "platform_admins_auth_user_id_fkey";

alter table "public"."rbac_assignments" add constraint "rbac_assignments_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."rbac_assignments" validate constraint "rbac_assignments_org_id_fkey";

alter table "public"."rbac_assignments" add constraint "rbac_assignments_role_fkey" FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE not valid;

alter table "public"."rbac_assignments" validate constraint "rbac_assignments_role_fkey";

alter table "public"."rbac_grants" add constraint "rbac_grants_permission_key_fkey" FOREIGN KEY (permission_key) REFERENCES public.rbac_permissions(key) ON DELETE CASCADE not valid;

alter table "public"."rbac_grants" validate constraint "rbac_grants_permission_key_fkey";

alter table "public"."rbac_role_permissions" add constraint "rbac_role_permissions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."rbac_role_permissions" validate constraint "rbac_role_permissions_org_id_fkey";

alter table "public"."rbac_role_permissions" add constraint "rbac_role_permissions_permission_key_fkey" FOREIGN KEY (permission_key) REFERENCES public.rbac_permissions(key) ON DELETE CASCADE not valid;

alter table "public"."rbac_role_permissions" validate constraint "rbac_role_permissions_permission_key_fkey";

alter table "public"."rbac_role_permissions" add constraint "rbac_role_permissions_role_fkey" FOREIGN KEY (role_code, org_id) REFERENCES public.rbac_roles(code, org_id) ON DELETE CASCADE not valid;

alter table "public"."rbac_role_permissions" validate constraint "rbac_role_permissions_role_fkey";

alter table "public"."rbac_roles" add constraint "rbac_roles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."rbac_roles" validate constraint "rbac_roles_org_id_fkey";

alter table "public"."role_assignments" add constraint "role_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."role_assignments" validate constraint "role_assignments_assigned_by_fkey";

alter table "public"."role_assignments" add constraint "role_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."role_assignments" validate constraint "role_assignments_user_id_fkey";

alter table "public"."security_audit_logs" add constraint "security_audit_logs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) not valid;

alter table "public"."security_audit_logs" validate constraint "security_audit_logs_org_id_fkey";

alter table "public"."sync_configurations" add constraint "sync_configurations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."sync_configurations" validate constraint "sync_configurations_company_id_fkey";

alter table "public"."sync_configurations" add constraint "sync_configurations_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) ON DELETE SET NULL not valid;

alter table "public"."sync_configurations" validate constraint "sync_configurations_company_unit_id_fkey";

alter table "public"."sync_configurations" add constraint "sync_configurations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."sync_configurations" validate constraint "sync_configurations_organization_id_fkey";

alter table "public"."sync_logs" add constraint "sync_logs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL not valid;

alter table "public"."sync_logs" validate constraint "sync_logs_company_id_fkey";

alter table "public"."sync_logs" add constraint "sync_logs_company_unit_id_fkey" FOREIGN KEY (company_unit_id) REFERENCES public.company_units(id) ON DELETE SET NULL not valid;

alter table "public"."sync_logs" validate constraint "sync_logs_company_unit_id_fkey";

alter table "public"."sync_logs" add constraint "sync_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."sync_logs" validate constraint "sync_logs_organization_id_fkey";

alter table "public"."time_tracking_entries" add constraint "time_tracking_entries_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."time_tracking_entries" validate constraint "time_tracking_entries_employee_id_fkey";

alter table "public"."time_tracking_entries" add constraint "time_tracking_entries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."time_tracking_entries" validate constraint "time_tracking_entries_organization_id_fkey";

alter table "public"."time_tracking_entries" add constraint "time_tracking_entries_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."time_tracking_entries" validate constraint "time_tracking_entries_project_id_fkey";

alter table "public"."timesheet_entries" add constraint "timesheet_entries_attendance_daily_summary_id_fkey" FOREIGN KEY (attendance_daily_summary_id) REFERENCES public.attendance_daily_summary(id) ON DELETE SET NULL not valid;

alter table "public"."timesheet_entries" validate constraint "timesheet_entries_attendance_daily_summary_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

alter table "public"."user_sessions" add constraint "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_sessions" validate constraint "user_sessions_user_id_fkey";

alter table "public"."users" add constraint "users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_created_by_fkey";

alter table "public"."users" add constraint "users_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_manager_id_fkey";

alter table "public"."users" add constraint "users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.pay_groups(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_organization_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION ippms.can_manage_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    ippms.is_privileged()
    or exists (
      select 1
      from public.employees e
      where e.user_id = auth.uid() and e.project_id = p_project_id
    );
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_apply_holiday(p_project_id uuid, p_holiday_date date, p_name text, p_country text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  v_holiday_id uuid;
  emp record;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply holiday';
  end if;

  insert into ippms.ippms_holidays(name, holiday_date, country, project_id)
  values (p_name, p_holiday_date, p_country, p_project_id)
  on conflict (project_id, holiday_date) do update
    set name = excluded.name,
        country = excluded.country,
        updated_at = now()
  returning id into v_holiday_id;

  for emp in
    select id from public.employees where project_id = p_project_id
  loop
    perform ippms.ippms_update_work_type(emp.id, p_project_id, p_holiday_date, 'HOLIDAY');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      emp.id, p_project_id, p_holiday_date, 'PUBLIC_HOLIDAY', auth.uid(), 'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = 'PUBLIC_HOLIDAY',
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_holiday_id;

    update ippms.ippms_work_days
    set attendance_id = v_holiday_id,
        work_type = 'HOLIDAY',
        piece_entry_id = null
    where employee_id = emp.id and project_id = p_project_id and work_date = p_holiday_date;
  end loop;

  return v_holiday_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_apply_leave(p_employee_id uuid, p_project_id uuid, p_leave_type_id uuid, p_start date, p_end date, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  v_leave_id uuid;
  v_paid boolean;
  v_dt date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to apply leave';
  end if;

  select paid into v_paid from ippms.ippms_leave_types where id = p_leave_type_id;

  insert into ippms.ippms_leave_requests(
    employee_id, project_id, leave_type_id, start_date, end_date, reason, status, approved_by
  ) values (
    p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason, 'APPROVED', auth.uid()
  )
  returning id into v_leave_id;

  v_dt := p_start;
  while v_dt <= p_end loop
    perform ippms.ippms_update_work_type(p_employee_id, p_project_id, v_dt, 'LEAVE');

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, recorded_by, recorded_source
    ) values (
      p_employee_id, p_project_id, v_dt,
      case when v_paid then 'LEAVE' else 'UNPAID_LEAVE' end,
      auth.uid(),
      'SYSTEM_AUTO'
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into strict v_leave_id;

    update ippms.ippms_work_days
    set attendance_id = v_leave_id,
        work_type = 'LEAVE',
        piece_entry_id = null
    where employee_id = p_employee_id and project_id = p_project_id and work_date = v_dt;

    v_dt := v_dt + interval '1 day';
  end loop;

  return v_leave_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_assign_shift(p_employee_id uuid, p_project_id uuid, p_shift_id uuid, p_start date, p_end date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to assign shift';
  end if;

  insert into ippms.ippms_employee_shifts(employee_id, project_id, shift_id, start_date, end_date)
  values (p_employee_id, p_project_id, p_shift_id, p_start, p_end)
  on conflict (employee_id, project_id, shift_id, start_date) do update
    set end_date = excluded.end_date,
        active = true,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_daily_payrun_rows(p_project_id uuid, p_start date, p_end date)
 RETURNS TABLE(employee_id uuid, work_date date, status ippms.ippms_attendance_status, daily_rate_snapshot numeric, work_day_id uuid, attendance_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, ar.status, ar.daily_rate_snapshot, wd.id, ar.id
  from ippms.ippms_work_days wd
  join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    and wd.payrun_id is null
    and ar.status in ('PRESENT','PUBLIC_HOLIDAY','LEAVE','UNPAID_LEAVE');
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_generate_attendance_template(p_project_id uuid)
 RETURNS TABLE(employee_id uuid, attendance_date date, status text, shift_id uuid, hours_worked numeric, overtime_hours numeric, remarks text)
 LANGUAGE sql
 STABLE
AS $function$
  select e.id as employee_id, current_date as attendance_date, 'PRESENT'::text as status, null::uuid as shift_id, 8::numeric as hours_worked, 0::numeric as overtime_hours, null::text as remarks
  from public.employees e
  where e.project_id = p_project_id;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_generate_piecework_template(p_project_id uuid)
 RETURNS TABLE(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric)
 LANGUAGE sql
 STABLE
AS $function$
  select e.id, current_date, null::uuid as piece_id, 0::numeric as quantity, null::numeric as rate_snapshot
  from public.employees e
  where e.project_id = p_project_id;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_get_attendance(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF ippms.ippms_attendance_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view attendance';
  end if;

  return query
  select *
  from ippms.ippms_attendance_records
  where project_id = p_project_id
    and attendance_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_get_piece_entries(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF ippms.ippms_piece_work_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view piece work';
  end if;

  return query
  select *
  from ippms.ippms_piece_work_entries
  where project_id = p_project_id
    and work_date between p_start and p_end
    and (p_employee_id is null or employee_id = p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_get_shifts(p_project_id uuid)
 RETURNS SETOF ippms.ippms_shifts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view shifts';
  end if;
  return query select * from ippms.ippms_shifts where project_id = p_project_id or project_id is null order by is_default desc, name;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_get_work_days(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, employee_id uuid, project_id uuid, work_date date, work_type ippms.ippms_work_type, attendance_status ippms.ippms_attendance_status, piece_id uuid, quantity numeric, rate_snapshot numeric, is_locked boolean, payrun_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to view work days';
  end if;

  return query
  select
    wd.id,
    wd.employee_id,
    wd.project_id,
    wd.work_date,
    wd.work_type,
    ar.status as attendance_status,
    pe.piece_id,
    pe.quantity,
    pe.rate_snapshot,
    wd.is_locked,
    wd.payrun_id
  from ippms.ippms_work_days wd
  left join ippms.ippms_attendance_records ar on ar.id = wd.attendance_id
  left join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and (p_employee_id is null or wd.employee_id = p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_import_attendance_template(p_project_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  perform ippms.ippms_save_attendance_bulk(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_import_piecework_template(p_project_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  perform ippms.ippms_save_piece_entries(p_project_id, p_payload);
  return jsonb_build_object('status','ok');
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_lock_daily_payrun(p_payrun_id uuid, p_work_day_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  update ippms.ippms_work_days
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_work_day_ids);

  update ippms.ippms_attendance_records ar
  set payrun_id = p_payrun_id, is_locked = true
  where ar.id in (select attendance_id from ippms.ippms_work_days where id = any(p_work_day_ids));
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_lock_piece_payrun(p_payrun_id uuid, p_piece_entry_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  update ippms.ippms_piece_work_entries
  set payrun_id = p_payrun_id, is_locked = true
  where id = any(p_piece_entry_ids);

  update ippms.ippms_work_days wd
  set payrun_id = p_payrun_id, is_locked = true
  where wd.piece_entry_id = any(p_piece_entry_ids);
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_piece_payrun_rows(p_project_id uuid, p_start date, p_end date)
 RETURNS TABLE(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric, piece_entry_id uuid, work_day_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to read piece payrun rows';
  end if;

  return query
  select wd.employee_id, wd.work_date, pe.piece_id, pe.quantity, pe.rate_snapshot, pe.id, wd.id
  from ippms.ippms_work_days wd
  join ippms.ippms_piece_work_entries pe on pe.id = wd.piece_entry_id
  where wd.project_id = p_project_id
    and wd.work_date between p_start and p_end
    and wd.work_type = 'PIECE_RATE'
    and wd.payrun_id is null;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_save_attendance_bulk(p_project_id uuid, p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  rec jsonb;
  v_id uuid;
  v_status ippms.ippms_attendance_status;
  v_emp uuid;
  v_date date;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage attendance';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'attendance_date')::date;
    v_status := (rec->>'status')::ippms.ippms_attendance_status;

    -- Guard against piece work already present
    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type = 'PIECE_RATE'
    ) then
      raise exception 'Work day already recorded as PIECE_RATE for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_attendance_records(
      employee_id, project_id, attendance_date, status, shift_id,
      hours_worked, overtime_hours, remarks, daily_rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date, v_status,
      (rec->>'shift_id')::uuid,
      nullif(rec->>'hours_worked','')::numeric,
      nullif(rec->>'overtime_hours','')::numeric,
      rec->>'remarks',
      nullif(rec->>'daily_rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_recorded_source, 'PROJECT_ADMIN')
    )
    on conflict (employee_id, project_id, attendance_date) do update
      set status = excluded.status,
          shift_id = excluded.shift_id,
          hours_worked = excluded.hours_worked,
          overtime_hours = excluded.overtime_hours,
          remarks = excluded.remarks,
          daily_rate_snapshot = excluded.daily_rate_snapshot,
          recorded_by = excluded.recorded_by,
          recorded_source = excluded.recorded_source,
          updated_at = now()
    returning id into v_id;

    -- ensure work_day linkage
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, attendance_id)
    values (v_emp, p_project_id, v_date, case when v_status in ('LEAVE','UNPAID_LEAVE') then 'LEAVE' when v_status = 'PUBLIC_HOLIDAY' then 'HOLIDAY' else 'DAILY_RATE' end, v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = excluded.work_type,
          attendance_id = v_id,
          piece_entry_id = case when excluded.work_type = 'DAILY_RATE' then null else ippms.ippms_work_days.piece_entry_id end,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_save_piece_entries(p_project_id uuid, p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  rec jsonb;
  v_emp uuid;
  v_date date;
  v_id uuid;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to manage piece work';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    v_emp := (rec->>'employee_id')::uuid;
    v_date := (rec->>'work_date')::date;

    if exists (
      select 1 from ippms.ippms_work_days wd
      where wd.employee_id = v_emp and wd.project_id = p_project_id and wd.work_date = v_date and wd.work_type in ('DAILY_RATE','LEAVE','HOLIDAY')
    ) then
      raise exception 'Work day already marked for daily/leave/holiday for %, %', v_emp, v_date;
    end if;

    insert into ippms.ippms_piece_work_entries(
      employee_id, project_id, work_date, piece_id, quantity, rate_snapshot,
      recorded_by, recorded_source
    ) values (
      v_emp, p_project_id, v_date,
      (rec->>'piece_id')::uuid,
      nullif(rec->>'quantity','')::numeric,
      nullif(rec->>'rate_snapshot','')::numeric,
      auth.uid(),
      coalesce((rec->>'recorded_source')::ippms.ippms_piece_recorded_source, 'PROJECT_ADMIN')
    )
    returning id into v_id;

    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type, piece_entry_id)
    values (v_emp, p_project_id, v_date, 'PIECE_RATE', v_id)
    on conflict (employee_id, project_id, work_date) do update
      set work_type = 'PIECE_RATE',
          piece_entry_id = v_id,
          attendance_id = null,
          updated_at = now();
  end loop;

  return jsonb_build_object('status','ok');
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.ippms_update_work_type(p_employee_id uuid, p_project_id uuid, p_work_date date, p_work_type ippms.ippms_work_type)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
declare
  v_id uuid;
  v_locked boolean;
begin
  if not ippms.can_manage_project(p_project_id) then
    raise exception 'Not authorized to update work days';
  end if;

  select id, is_locked into v_id, v_locked
  from ippms.ippms_work_days
  where employee_id = p_employee_id and project_id = p_project_id and work_date = p_work_date;

  if v_locked then
    raise exception 'Work day is locked for payrun';
  end if;

  if v_id is null then
    insert into ippms.ippms_work_days(employee_id, project_id, work_date, work_type)
    values (p_employee_id, p_project_id, p_work_date, p_work_type)
    returning id into v_id;
  else
    update ippms.ippms_work_days
    set work_type = p_work_type,
        attendance_id = case when p_work_type in ('DAILY_RATE','LEAVE','HOLIDAY') then attendance_id else null end,
        piece_entry_id = case when p_work_type = 'PIECE_RATE' then piece_entry_id else null end
    where id = v_id;
  end if;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION ippms.is_privileged()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  with jwt as (
    select coalesce(current_setting('request.jwt.claims', true)::json, '{}'::json) as c
  )
  select
    coalesce(public.is_platform_admin(auth.uid()), false)
    or public.has_permission(auth.uid(), 'payroll.prepare')
    or public.has_permission(auth.uid(), 'payroll.approve')
    or public.has_permission(auth.uid(), 'people.view')
    or public.has_permission(auth.uid(), 'people.edit')
    or (select (c->>'role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or (select (c->>'app_role') in ('platform_admin','org_admin','super_admin','admin') from jwt)
    or auth.role() = 'service_role';
$function$
;

CREATE OR REPLACE FUNCTION ippms.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.can_perform_action(p_org_id uuid, p_company_id uuid, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  allowed_roles text[];
  needs_company boolean := p_company_id is not null;
begin
  if public.is_platform_admin() then
    return true;
  end if;

  if needs_company and not public.has_company_membership(p_company_id) then
    return false;
  end if;

  -- baseline RBAC: which org roles may ever perform the action
  if p_action = 'approve_payroll' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'export_bank_schedule' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_PAYROLL_ADMIN','ORG_FINANCE_APPROVER','ORG_HEAD_OFFICE_PAYROLL'];
  elsif p_action = 'pii.read' then
    allowed_roles := array['ORG_OWNER','ORG_ADMIN','ORG_HR','ORG_PAYROLL_ADMIN','ORG_HEAD_OFFICE_PAYROLL'];
  else
    -- Non-sensitive / unknown action: require explicit grant to be safe
    allowed_roles := array['ORG_OWNER','ORG_ADMIN'];
  end if;

  if not public.has_any_org_role(p_org_id, allowed_roles) then
    return false;
  end if;

  -- Sensitive actions require explicit allow (deny overrides allow)
  return public.has_grant(p_org_id, 'action', p_action, p_company_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delegate_approval_step(payrun_id_input uuid, new_approver_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending'; 
    END IF;
    
    -- Must be current approver OR admin
    -- For simplicty checking current approver first
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level;
      
    IF v_step.approver_user_id != auth.uid() AND NOT public.check_is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to delegate';
    END IF;
    
    -- Perform Delegation
    UPDATE public.payrun_approval_steps
    SET 
        original_approver_id = CASE WHEN original_approver_id IS NULL THEN approver_user_id ELSE original_approver_id END,
        approver_user_id = new_approver_id,
        delegated_by = auth.uid(),
        delegated_at = now()
    WHERE id = v_step.id;
    
    -- Notify New Approver
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        new_approver_id,
        'approval_request',
        'Delegated Approval',
        'An approval step has been delegated to you.',
        jsonb_build_object('payrun_id', payrun_id_input)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$function$
;

create or replace view "public"."employee_pay_groups" as  SELECT peg.id,
    peg.pay_group_id,
    peg.employee_id,
    peg.assigned_at AS assigned_on,
    peg.removed_at AS unassigned_on,
    pg.organization_id,
    e.id AS emp_id,
    e.first_name AS emp_first_name,
    e.middle_name AS emp_middle_name,
    e.last_name AS emp_last_name,
    e.email AS emp_email,
    e.pay_type AS emp_pay_type,
    e.pay_rate AS emp_pay_rate,
    e.currency AS emp_currency,
    e.country AS emp_country,
    e.employee_type AS emp_employee_type
   FROM ((public.paygroup_employees peg
     LEFT JOIN public.employees e ON ((e.id = peg.employee_id)))
     LEFT JOIN public.pay_groups pg ON ((pg.id = peg.pay_group_id)));


CREATE OR REPLACE FUNCTION public.enforce_unique_paygroup_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  duplicate_count int;
BEGIN
  -- Skip check if assignment is being deactivated
  IF (NEW.active = false) THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate assignments based on employee identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    )
    AND pe.employee_id != NEW.employee_id;

  -- If duplicates found, deactivate old assignments (smart mode)
  IF duplicate_count > 0 THEN
    UPDATE paygroup_employees
    SET active = false
    WHERE employee_id IN (
      SELECT id FROM employees WHERE
        (national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id) AND national_id IS NOT NULL) OR
        (tin = (SELECT tin FROM employees WHERE id = NEW.employee_id) AND tin IS NOT NULL) OR
        (social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id) AND social_security_number IS NOT NULL)
    )
    AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)
  FROM public.notifications
  WHERE user_id = _user_id
    AND read_at IS NULL
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organization()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT (SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1);
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT role::text FROM public.role_assignments WHERE user_id = auth.uid() AND is_active = true ORDER BY assigned_at DESC LIMIT 1),
    (SELECT role::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    'employee'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_org_role(p_org_id uuid, p_role_keys text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.org_users ou
      join public.org_user_roles our on our.org_user_id = ou.id
      join public.org_roles r on r.id = our.role_id
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.status = 'active'
        and r.key = any(p_role_keys)
    );
$function$
;

CREATE OR REPLACE FUNCTION public.has_grant(p_org_id uuid, p_scope_type text, p_scope_key text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_platform_admin()
    or (
      not exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'deny'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
      and exists (
        select 1
        from public.access_grants g
        where g.org_id = p_org_id
          and g.effect = 'allow'
          and g.scope_type = p_scope_type
          and g.scope_key = p_scope_key
          and (g.company_id is null or g.company_id = p_company_id)
          and (
            g.user_id = auth.uid()
            or (
              g.role_id is not null and exists (
                select 1
                from public.org_users ou
                join public.org_user_roles our on our.org_user_id = ou.id
                where ou.org_id = p_org_id
                  and ou.user_id = auth.uid()
                  and ou.status = 'active'
                  and our.role_id = g.role_id
              )
            )
          )
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_role(p_org_id uuid, p_role_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.org_users ou
      join public.org_user_roles our on our.org_user_id = ou.id
      join public.org_roles r on r.id = our.role_id
      where ou.org_id = p_org_id
        and ou.user_id = auth.uid()
        and ou.status = 'active'
        and r.key = p_role_key
    );
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_apply_holiday(p_project_id uuid, p_holiday_date date, p_name text, p_country text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_apply_holiday(p_project_id, p_holiday_date, p_name, p_country);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_apply_leave(p_employee_id uuid, p_project_id uuid, p_leave_type_id uuid, p_start date, p_end date, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_apply_leave(p_employee_id, p_project_id, p_leave_type_id, p_start, p_end, p_reason);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_assign_shift(p_employee_id uuid, p_project_id uuid, p_shift_id uuid, p_start date, p_end date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_assign_shift(p_employee_id, p_project_id, p_shift_id, p_start, p_end);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_daily_payrun_rows(p_project_id uuid, p_start date, p_end date)
 RETURNS TABLE(employee_id uuid, work_date date, status ippms.ippms_attendance_status, daily_rate_snapshot numeric, work_day_id uuid, attendance_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_daily_payrun_rows(p_project_id, p_start, p_end);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_generate_attendance_template(p_project_id uuid)
 RETURNS TABLE(employee_id uuid, attendance_date date, status text, shift_id uuid, hours_worked numeric, overtime_hours numeric, remarks text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
  select * from ippms.ippms_generate_attendance_template(p_project_id);
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_generate_piecework_template(p_project_id uuid)
 RETURNS TABLE(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
  select * from ippms.ippms_generate_piecework_template(p_project_id);
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_get_attendance(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF ippms.ippms_attendance_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_get_attendance(p_project_id, p_start, p_end, p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_get_piece_entries(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF ippms.ippms_piece_work_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_get_piece_entries(p_project_id, p_start, p_end, p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_get_shifts(p_project_id uuid)
 RETURNS SETOF ippms.ippms_shifts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_get_shifts(p_project_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_get_work_days(p_project_id uuid, p_start date, p_end date, p_employee_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, employee_id uuid, project_id uuid, work_date date, work_type ippms.ippms_work_type, attendance_status ippms.ippms_attendance_status, piece_id uuid, quantity numeric, rate_snapshot numeric, is_locked boolean, payrun_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_get_work_days(p_project_id, p_start, p_end, p_employee_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_import_attendance_template(p_project_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_import_attendance_template(p_project_id, p_payload);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_import_piecework_template(p_project_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_import_piecework_template(p_project_id, p_payload);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_lock_daily_payrun(p_payrun_id uuid, p_work_day_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  perform ippms.ippms_lock_daily_payrun(p_payrun_id, p_work_day_ids);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_lock_piece_payrun(p_payrun_id uuid, p_piece_entry_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  perform ippms.ippms_lock_piece_payrun(p_payrun_id, p_piece_entry_ids);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_piece_payrun_rows(p_project_id uuid, p_start date, p_end date)
 RETURNS TABLE(employee_id uuid, work_date date, piece_id uuid, quantity numeric, rate_snapshot numeric, piece_entry_id uuid, work_day_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return query select * from ippms.ippms_piece_payrun_rows(p_project_id, p_start, p_end);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_save_attendance_bulk(p_project_id uuid, p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_save_attendance_bulk(p_project_id, p_records);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_save_piece_entries(p_project_id uuid, p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_save_piece_entries(p_project_id, p_records);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ippms_update_work_type(p_employee_id uuid, p_project_id uuid, p_work_date date, p_work_type ippms.ippms_work_type)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'ippms'
AS $function$
begin
  return ippms.ippms_update_work_type(p_employee_id, p_project_id, p_work_date, p_work_type);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_platform_admin()
    or public.has_org_role(p_org_id, 'ORG_OWNER')
    or public.has_org_role(p_org_id, 'ORG_ADMIN');
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = _user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = _notification_id
    AND user_id = _user_id
    AND read_at IS NULL;
END;
$function$
;

create or replace view "public"."master_payrolls" as  SELECT id,
    organization_id,
    pay_group_id,
    pay_period_start,
    pay_period_end,
    total_gross,
    total_net,
    payroll_status,
    0 AS total_employees
   FROM public.pay_runs pr;


create or replace view "public"."paygroup_employees_legacy" as  SELECT id,
    employee_id,
    active,
    assigned_at,
    removed_at,
    assigned_by,
    notes,
    pay_group_master_id AS paygroup_id,
    pay_group_master_id,
    pay_group_id
   FROM public.paygroup_employees pe;


create or replace view "public"."paygroup_employees_view" as  SELECT peg.id AS assignment_id,
    peg.employee_id,
    peg.pay_group_id,
    COALESCE(peg.active, true) AS active,
    pg.name AS pay_group_name,
    COALESCE(lower((pg.type)::text), 'local'::text) AS pay_group_type,
    pg.category,
    pg.employee_type,
    pg.pay_frequency,
    pg.pay_type
   FROM (public.paygroup_employees peg
     JOIN public.pay_groups pg ON ((pg.id = peg.pay_group_id)));


create or replace view "public"."paygroup_summary_view" as  SELECT pg.id,
    NULL::text AS paygroup_id,
    pg.name,
    COALESCE((pg.type)::text, 'regular'::text) AS type,
    pg.country,
    NULL::text AS currency,
    'active'::text AS status,
    COALESCE(employee_counts.employee_count, (0)::bigint) AS employee_count,
    pg.created_at,
    pg.updated_at,
    pg.pay_frequency,
    pg.default_tax_percentage,
    NULL::numeric AS exchange_rate_to_local,
    NULL::numeric AS default_daily_rate,
    NULL::text AS tax_country,
    pg.description AS notes
   FROM (public.pay_groups pg
     LEFT JOIN ( SELECT paygroup_employees.pay_group_id,
            count(*) AS employee_count
           FROM public.paygroup_employees
          WHERE (paygroup_employees.active = true)
          GROUP BY paygroup_employees.pay_group_id) employee_counts ON ((employee_counts.pay_group_id = pg.id)))
UNION ALL
 SELECT epg.id,
    epg.paygroup_id,
    epg.name,
    'expatriate'::text AS type,
    epg.country,
    epg.currency,
    'active'::text AS status,
    COALESCE(employee_counts.employee_count, (0)::bigint) AS employee_count,
    epg.created_at,
    epg.updated_at,
    NULL::text AS pay_frequency,
    NULL::numeric AS default_tax_percentage,
    epg.exchange_rate_to_local,
    NULL::numeric AS default_daily_rate,
    epg.tax_country,
    epg.notes
   FROM (public.expatriate_pay_groups epg
     LEFT JOIN ( SELECT paygroup_employees.pay_group_id,
            count(*) AS employee_count
           FROM public.paygroup_employees
          WHERE (paygroup_employees.active = true)
          GROUP BY paygroup_employees.pay_group_id) employee_counts ON ((employee_counts.pay_group_id = epg.id)));


CREATE OR REPLACE FUNCTION public.reject_payrun_step(payrun_id_input uuid, comments_input text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending approval'; 
    END IF;

    -- Verify User
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'Not authorized to reject this step';
    END IF;

    -- Update Step
    UPDATE public.payrun_approval_steps
    SET 
        status = 'rejected',
        actioned_at = now(),
        actioned_by = auth.uid(),
        comments = comments_input
    WHERE id = v_step.id;

    -- Update Payrun
    UPDATE public.pay_runs
    SET 
        approval_status = 'rejected',
        status = 'rejected',
        approval_last_action_at = now()
    WHERE id = payrun_id_input;
    
    -- Notify Creator
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        v_payrun.created_by,
        'payroll_alert',
        'Payrun Rejected',
        'Your payrun was rejected at Level ' || v_payrun.approval_current_level || '. Reason: ' || COALESCE(comments_input, 'None'),
        jsonb_build_object('payrun_id', payrun_id_input)
    );

    RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_legacy_pay_group_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.pay_group_master_id IS NOT NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_pay_group_columns()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If pay_group_master_id is set but pay_group_id is null, sync it
  IF NEW.pay_group_master_id IS NOT NULL AND NEW.pay_group_id IS NULL THEN
    SELECT pgm.source_id INTO NEW.pay_group_id
    FROM public.pay_group_master pgm
    WHERE pgm.id = NEW.pay_group_master_id;
  -- If pay_group_id is set but pay_group_master_id is null, sync it
  ELSIF NEW.pay_group_id IS NOT NULL AND NEW.pay_group_master_id IS NULL THEN
    SELECT pgm.id INTO NEW.pay_group_master_id
    FROM public.pay_group_master pgm
    WHERE pgm.source_id = NEW.pay_group_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_rbac_to_jwt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update auth.users app_metadata with role assignments and permissions
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_roles}',
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', ra.role_code,
          'scope_type', ra.scope_type,
          'scope_id', ra.scope_id
        )
      )
      FROM public.rbac_assignments ra
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{rbac_permissions}',
    (
      SELECT jsonb_agg(DISTINCT rrp.permission_key)
      FROM public.rbac_assignments ra
      JOIN public.rbac_role_permissions rrp ON ra.role_code = rrp.role_code
      WHERE ra.user_id = NEW.user_id
    )
  )
  WHERE id = NEW.user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{is_platform_admin}',
    to_jsonb(
      EXISTS (
        SELECT 1
        FROM public.rbac_assignments ra
        JOIN public.rbac_roles rr ON ra.role_code = rr.code
        WHERE ra.user_id = NEW.user_id
          AND rr.tier = 'PLATFORM'
          AND ra.scope_type = 'GLOBAL'
      )
    )
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_banks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_pay_group_id(pay_group_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM public.pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM public.expatriate_pay_groups WHERE id = pay_group_id) THEN
    RETURN true;
  END IF;
  
  -- If not found in either table, return false
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_paygroup_employees_pay_group_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Skip validation if pay_group_master_id is set (new schema)
  -- In the new schema, pay_group_master_id is the source of truth
  IF NEW.pay_group_master_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip validation if pay_group_id is null
  IF NEW.pay_group_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only validate pay_group_id if pay_group_master_id is NOT set (legacy records)
  -- Check if the ID exists in pay_groups table
  IF EXISTS (SELECT 1 FROM pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if the ID exists in expatriate_pay_groups table
  IF EXISTS (SELECT 1 FROM expatriate_pay_groups WHERE id = NEW.pay_group_id) THEN
    RETURN NEW;
  END IF;
  
  -- If not found in either table, raise exception
  RAISE EXCEPTION 'Pay group ID % does not exist in pay_groups or expatriate_pay_groups table', NEW.pay_group_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_single_paygroup_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  -- Only check for active assignments
  IF NEW.active = true THEN
    -- Check if employee is already in another active pay group
    IF EXISTS (
      SELECT 1 FROM public.paygroup_employees 
      WHERE employee_id = NEW.employee_id 
        AND active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Employee is already assigned to another active pay group. Only one pay group per employee is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_super_admin_setup(user_id uuid, security_questions jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    -- Update user to mark setup as complete
    UPDATE public.users 
    SET 
        two_factor_enabled = true,
        updated_at = NOW()
    WHERE id = user_id AND role = 'super_admin';
    
    -- Log the setup completion
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent,
        timestamp,
        result
    ) VALUES (
        user_id,
        'super_admin_setup_completed',
        'system',
        COALESCE(security_questions, '{}'::jsonb),
        '127.0.0.1',
        'System',
        NOW(),
        'success'
    );
    
    RETURN true;
END;
$function$
;

create or replace view "public"."employee_master" as  SELECT id,
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000001'::uuid) AS organization_id,
    first_name,
    last_name,
        CASE
            WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN ((first_name || ' '::text) || last_name)
            WHEN (first_name IS NOT NULL) THEN first_name
            WHEN (last_name IS NOT NULL) THEN last_name
            ELSE ''::text
        END AS name,
    email,
    personal_email,
    phone,
    work_phone,
    employee_number,
    employee_type,
    employee_category,
    engagement_type,
    employment_status,
    designation,
    work_location,
    nationality,
    citizenship,
    date_joined,
    country,
    currency,
    company_id,
    company_unit_id,
    pay_group_id,
    status,
    user_id,
    created_at,
    updated_at
   FROM public.employees;


CREATE OR REPLACE FUNCTION public.generate_temp_password()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password TEXT := '';
    i INTEGER;
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    FOR i IN 1..16 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    RETURN password;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_company_membership(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_company_memberships ucm
      where ucm.user_id = auth.uid()
        and ucm.company_id = p_company_id
    );
$function$
;

CREATE OR REPLACE FUNCTION public.increment_failed_login_attempts(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW()
  WHERE id = _user_id
  RETURNING failed_login_attempts INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_employee_number_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);
  IF NEW.employee_number IS DISTINCT FROM OLD.employee_number THEN
    INSERT INTO public.employee_number_history (employee_id, old_employee_number, new_employee_number, changed_by, reason)
    VALUES (NEW.id, OLD.employee_number, NEW.employee_number, NULL, 'Manual or system change');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET failed_login_attempts = 0, updated_at = NOW()
  WHERE id = _user_id;
END;
$function$
;

create or replace view "public"."super_admin_dashboard" as  SELECT u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.two_factor_enabled,
    u.last_login,
    u.created_at,
    count(DISTINCT s.id) AS active_sessions,
    count(DISTINCT al.id) AS recent_activity_count
   FROM ((public.users u
     LEFT JOIN public.user_sessions s ON (((u.id = s.user_id) AND (s.is_active = true))))
     LEFT JOIN public.audit_logs al ON ((((u.id)::text = (al.user_id)::text) AND (al."timestamp" >= (now() - '24:00:00'::interval)))))
  WHERE ((u.role)::text = 'super_admin'::text)
  GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.two_factor_enabled, u.last_login, u.created_at;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM set_config('search_path', 'public, pg_catalog', true);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(target_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.organization_id = target_org_id
  );
$function$
;


  create policy "ippms_attendance_select_self"
  on "ippms"."ippms_attendance_records"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = ippms_attendance_records.employee_id) AND (e.user_id = auth.uid()))))));



  create policy "ippms_attendance_write_admin"
  on "ippms"."ippms_attendance_records"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_employee_shifts_read"
  on "ippms"."ippms_employee_shifts"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = ippms_employee_shifts.employee_id) AND (e.user_id = auth.uid()))))));



  create policy "ippms_employee_shifts_write"
  on "ippms"."ippms_employee_shifts"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_holidays_read"
  on "ippms"."ippms_holidays"
  as permissive
  for select
  to public
using (true);



  create policy "ippms_holidays_write"
  on "ippms"."ippms_holidays"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_leave_requests_select"
  on "ippms"."ippms_leave_requests"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = ippms_leave_requests.employee_id) AND (e.user_id = auth.uid()))))));



  create policy "ippms_leave_requests_write"
  on "ippms"."ippms_leave_requests"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_leave_types_read"
  on "ippms"."ippms_leave_types"
  as permissive
  for select
  to public
using (true);



  create policy "ippms_leave_types_write"
  on "ippms"."ippms_leave_types"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_piece_catalogue_read"
  on "ippms"."ippms_piece_work_catalogue"
  as permissive
  for select
  to public
using (true);



  create policy "ippms_piece_catalogue_write"
  on "ippms"."ippms_piece_work_catalogue"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_piece_entries_select_self"
  on "ippms"."ippms_piece_work_entries"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = ippms_piece_work_entries.employee_id) AND (e.user_id = auth.uid()))))));



  create policy "ippms_piece_entries_write_admin"
  on "ippms"."ippms_piece_work_entries"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_piece_rates_read"
  on "ippms"."ippms_piece_work_rates"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_piece_rates_write"
  on "ippms"."ippms_piece_work_rates"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_shifts_read"
  on "ippms"."ippms_shifts"
  as permissive
  for select
  to public
using (true);



  create policy "ippms_shifts_write"
  on "ippms"."ippms_shifts"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "ippms_work_days_select_self"
  on "ippms"."ippms_work_days"
  as permissive
  for select
  to public
using ((ippms.is_privileged() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = ippms_work_days.employee_id) AND (e.user_id = auth.uid()))))));



  create policy "ippms_work_days_write_admin"
  on "ippms"."ippms_work_days"
  as permissive
  for all
  to public
using ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)))
with check ((ippms.is_privileged() OR (auth.role() = 'service_role'::text)));



  create policy "activity_logs_insert_authenticated"
  on "public"."activity_logs"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Admin access to alert logs"
  on "public"."alert_logs"
  as permissive
  for all
  to public
using (true);



  create policy "Admin access to alert rules"
  on "public"."alert_rules"
  as permissive
  for all
  to public
using (true);



  create policy "Workflow Steps Managed by Super Admins"
  on "public"."approval_workflow_steps"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Workflow Steps Readable by Org Members"
  on "public"."approval_workflow_steps"
  as permissive
  for select
  to authenticated
using ((workflow_id IN ( SELECT approval_workflows.id
   FROM public.approval_workflows
  WHERE (approval_workflows.org_id IN ( SELECT users.organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));



  create policy "Workflows Managed by Super Admins"
  on "public"."approval_workflows"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Workflows Readable by Org Members"
  on "public"."approval_workflows"
  as permissive
  for select
  to authenticated
using ((org_id IN ( SELECT users.organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));



  create policy "Admin access to attendance records"
  on "public"."attendance_records"
  as permissive
  for all
  to public
using (true);



  create policy "Admin access to audit logs"
  on "public"."audit_logs"
  as permissive
  for all
  to public
using (true);



  create policy "Admins can view all audit logs"
  on "public"."audit_logs"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



  create policy "Users can view their own audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((auth.uid())::text = (user_id)::text));



  create policy "Authenticated users can insert banks"
  on "public"."banks"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can update banks"
  on "public"."banks"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can view banks"
  on "public"."banks"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all access to benefits"
  on "public"."benefits"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow authenticated users to insert companies"
  on "public"."companies"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to read companies"
  on "public"."companies"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update companies"
  on "public"."companies"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow all access to company settings"
  on "public"."company_settings"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Authenticated users can delete categories"
  on "public"."company_unit_categories"
  as permissive
  for delete
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Authenticated users can insert categories"
  on "public"."company_unit_categories"
  as permissive
  for insert
  to public
with check ((auth.uid() IS NOT NULL));



  create policy "Authenticated users can view categories"
  on "public"."company_unit_categories"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Allow authenticated users to create company units"
  on "public"."company_units"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to read company units"
  on "public"."company_units"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update company units"
  on "public"."company_units"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "company_units_select_by_membership"
  on "public"."company_units"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_company_memberships m
  WHERE ((m.company_id = company_units.company_id) AND (m.user_id = auth.uid())))));



  create policy "Enable delete for authenticated users"
  on "public"."contractor_pay_run_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert for authenticated users"
  on "public"."contractor_pay_run_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for authenticated users"
  on "public"."contractor_pay_run_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update for authenticated users"
  on "public"."contractor_pay_run_items"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Allow all authenticated users to read countries"
  on "public"."countries"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to read countries"
  on "public"."countries"
  as permissive
  for select
  to authenticated
using (true);



  create policy "database_health_log_admin_select"
  on "public"."database_health_log"
  as permissive
  for select
  to authenticated
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));



  create policy "database_health_log_service_insert"
  on "public"."database_health_log"
  as permissive
  for insert
  to authenticated
with check (((auth.jwt() ->> 'service'::text) = 'internal'::text));



  create policy "Everyone can read email events"
  on "public"."email_events"
  as permissive
  for select
  to public
using (true);



  create policy "Org Admins view own logs"
  on "public"."email_outbox"
  as permissive
  for select
  to public
using (public.is_org_admin(org_id));



  create policy "Everyone can read placeholders"
  on "public"."email_placeholders"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Org Admins update own templates"
  on "public"."email_templates"
  as permissive
  for update
  to public
using (((org_id IS NOT NULL) AND public.is_org_admin(org_id)));



  create policy "Org Admins write own templates"
  on "public"."email_templates"
  as permissive
  for insert
  to public
with check (((org_id IS NOT NULL) AND public.is_org_admin(org_id)));



  create policy "Org Admins manage triggers"
  on "public"."email_triggers"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id));



  create policy "Admins can manage categories"
  on "public"."employee_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['ORG_ADMIN'::text, 'SUPER_ADMIN'::text]))))));



  create policy "Users can view categories for their organization"
  on "public"."employee_categories"
  as permissive
  for select
  to authenticated
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Allow all access to employee_number_settings"
  on "public"."employee_number_settings"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "admin_write_employee_types"
  on "public"."employee_types"
  as permissive
  for all
  to authenticated
using (((auth.jwt() ->> 'user_role'::text) = 'admin'::text))
with check (((auth.jwt() ->> 'user_role'::text) = 'admin'::text));



  create policy "authenticated_read_employee_types"
  on "public"."employee_types"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all access to employees"
  on "public"."employees"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "employees_select_by_membership"
  on "public"."employees"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_company_memberships m
  WHERE ((m.company_id = employees.company_id) AND (m.user_id = auth.uid())))));



  create policy "Enable delete for authenticated users"
  on "public"."expatriate_pay_groups"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert for authenticated users"
  on "public"."expatriate_pay_groups"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."expatriate_pay_groups"
  as permissive
  for select
  to public
using (true);



  create policy "Enable update for authenticated users"
  on "public"."expatriate_pay_groups"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Allow all access to expatriate_pay_run_item_allowances"
  on "public"."expatriate_pay_run_item_allowances"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Enable delete for authenticated users"
  on "public"."expatriate_pay_run_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert for authenticated users"
  on "public"."expatriate_pay_run_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."expatriate_pay_run_items"
  as permissive
  for select
  to public
using (true);



  create policy "Enable read access for authenticated users"
  on "public"."expatriate_pay_run_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update for authenticated users"
  on "public"."expatriate_pay_run_items"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Allow all access to expatriate policies"
  on "public"."expatriate_policies"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Manage HO Company Units"
  on "public"."head_office_pay_group_company_units"
  as permissive
  for all
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Organization Admin'::text, 'Payroll Manager'::text])) AND ((EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_regular
  WHERE ((head_office_pay_groups_regular.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_regular.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))) OR (EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_interns
  WHERE ((head_office_pay_groups_interns.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_interns.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))) OR (EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_expatriates
  WHERE ((head_office_pay_groups_expatriates.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_expatriates.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))))));



  create policy "View HO Company Units"
  on "public"."head_office_pay_group_company_units"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_regular
  WHERE ((head_office_pay_groups_regular.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_regular.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))) OR (EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_interns
  WHERE ((head_office_pay_groups_interns.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_interns.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))) OR (EXISTS ( SELECT 1
   FROM public.head_office_pay_groups_expatriates
  WHERE ((head_office_pay_groups_expatriates.id = head_office_pay_group_company_units.pay_group_id) AND ((head_office_pay_groups_expatriates.organization_id)::text = (auth.jwt() ->> 'org_id'::text)))))));



  create policy "ho_membership_manage_policy"
  on "public"."head_office_pay_group_members"
  as permissive
  for all
  to authenticated
using ((public.is_platform_admin() OR (public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, public.get_auth_org_id()) AND (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = head_office_pay_group_members.employee_id) AND (e.organization_id = public.get_auth_org_id())))))))
with check ((public.is_platform_admin() OR (public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, public.get_auth_org_id()) AND (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = head_office_pay_group_members.employee_id) AND (e.organization_id = public.get_auth_org_id())))))));



  create policy "ho_membership_select_policy"
  on "public"."head_office_pay_group_members"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = head_office_pay_group_members.employee_id) AND (e.organization_id = public.get_auth_org_id()) AND (public.has_permission('people.view'::text, 'ORGANIZATION'::text, e.organization_id) OR public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, e.organization_id)))))));



  create policy "ho_pg_expatriates_manage_policy"
  on "public"."head_office_pay_groups_expatriates"
  as permissive
  for all
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = public.get_auth_org_id()) AND public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, organization_id))));



  create policy "ho_pg_expatriates_select_policy"
  on "public"."head_office_pay_groups_expatriates"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR (organization_id = public.get_auth_org_id())));



  create policy "ho_pg_interns_manage_policy"
  on "public"."head_office_pay_groups_interns"
  as permissive
  for all
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = public.get_auth_org_id()) AND public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, organization_id))));



  create policy "ho_pg_interns_select_policy"
  on "public"."head_office_pay_groups_interns"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR (organization_id = public.get_auth_org_id())));



  create policy "ho_pg_regular_manage_policy"
  on "public"."head_office_pay_groups_regular"
  as permissive
  for all
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = public.get_auth_org_id()) AND public.has_permission('payroll.prepare'::text, 'ORGANIZATION'::text, organization_id))));



  create policy "ho_pg_regular_select_policy"
  on "public"."head_office_pay_groups_regular"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR (organization_id = public.get_auth_org_id())));



  create policy "View HO Payrun Items"
  on "public"."head_office_pay_run_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.head_office_pay_runs
  WHERE ((head_office_pay_runs.id = head_office_pay_run_items.pay_run_id) AND ((head_office_pay_runs.organization_id)::text = (auth.jwt() ->> 'org_id'::text))))));



  create policy "Manage HO Payruns"
  on "public"."head_office_pay_runs"
  as permissive
  for all
  to authenticated
using ((((organization_id)::text = (auth.jwt() ->> 'org_id'::text)) AND ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['Super Admin'::text, 'Organization Admin'::text, 'Payroll Manager'::text]))));



  create policy "View HO Payruns"
  on "public"."head_office_pay_runs"
  as permissive
  for select
  to public
using (((organization_id)::text = (auth.jwt() ->> 'org_id'::text)));



  create policy "impersonation_logs_insert_super_admin_only"
  on "public"."impersonation_logs"
  as permissive
  for insert
  to authenticated
with check (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));



  create policy "impersonation_logs_select_super_admin_only"
  on "public"."impersonation_logs"
  as permissive
  for select
  to authenticated
using (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));



  create policy "Admin access to integration health"
  on "public"."integration_health"
  as permissive
  for all
  to public
using (true);



  create policy "Enable delete for authenticated users"
  on "public"."intern_pay_run_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert for authenticated users"
  on "public"."intern_pay_run_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for authenticated users"
  on "public"."intern_pay_run_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update for authenticated users"
  on "public"."intern_pay_run_items"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Enable delete for authenticated users"
  on "public"."local_pay_run_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert for authenticated users"
  on "public"."local_pay_run_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for authenticated users"
  on "public"."local_pay_run_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update for authenticated users"
  on "public"."local_pay_run_items"
  as permissive
  for update
  to authenticated
using (true);



  create policy "lst_employee_assignments_no_client_write"
  on "public"."lst_employee_assignments"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "lst_employee_assignments_select_authenticated"
  on "public"."lst_employee_assignments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.is_active = true)))));



  create policy "lst_payment_plans_no_client_write"
  on "public"."lst_payment_plans"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "lst_payment_plans_select_public"
  on "public"."lst_payment_plans"
  as permissive
  for select
  to public
using (true);



  create policy "Admin access to notification channels"
  on "public"."notification_channels"
  as permissive
  for all
  to public
using (true);



  create policy "Service role can insert notifications"
  on "public"."notifications"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Users can view own notifications"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Org Settings Readable by Org Members"
  on "public"."org_settings"
  as permissive
  for select
  to authenticated
using ((organization_id IN ( SELECT users.organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));



  create policy "Org Settings Start/Update by Super Admin Only"
  on "public"."org_settings"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())))
with check ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "org_mutate_super_admin_only"
  on "public"."organizations"
  as permissive
  for all
  to authenticated
using (((auth.jwt() ->> 'role'::text) = 'super_admin'::text))
with check (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));



  create policy "org_select_member_or_super_admin"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'super_admin'::text) OR (id = ((auth.jwt() ->> 'organization_id'::text))::uuid) OR (id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())))));



  create policy "Authenticated users can view audit logs"
  on "public"."pay_calculation_audit_log"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Service role can insert audit logs"
  on "public"."pay_calculation_audit_log"
  as permissive
  for insert
  to service_role
with check (true);



  create policy "pgm_delete"
  on "public"."pay_group_master"
  as permissive
  for delete
  to public
using (true);



  create policy "pgm_insert"
  on "public"."pay_group_master"
  as permissive
  for insert
  to public
with check (true);



  create policy "pgm_update"
  on "public"."pay_group_master"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "Allow all access to pay groups"
  on "public"."pay_groups"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all access to pay items"
  on "public"."pay_items"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow all access to pay runs"
  on "public"."pay_runs"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "pay_runs_select_by_org_claim"
  on "public"."pay_runs"
  as permissive
  for select
  to authenticated
using ((((auth.jwt() ->> 'org_id'::text) IS NOT NULL) AND (((auth.jwt() ->> 'org_id'::text))::uuid = organization_id)));



  create policy "Allow authenticated users to manage paygroup employees"
  on "public"."paygroup_employees"
  as permissive
  for all
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Allow authenticated users to view paygroup employees"
  on "public"."paygroup_employees"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "delete paygroup_employees"
  on "public"."paygroup_employees"
  as permissive
  for delete
  to public
using ((auth.uid() IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = ANY (ARRAY['super_admin'::public.app_role, 'admin'::public.app_role, 'manager'::public.app_role])))));



  create policy "insert paygroup_employees"
  on "public"."paygroup_employees"
  as permissive
  for insert
  to public
with check ((auth.uid() IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = ANY (ARRAY['super_admin'::public.app_role, 'admin'::public.app_role, 'manager'::public.app_role])))));



  create policy "update paygroup_employees"
  on "public"."paygroup_employees"
  as permissive
  for update
  to public
using ((auth.uid() IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = ANY (ARRAY['super_admin'::public.app_role, 'admin'::public.app_role, 'manager'::public.app_role])))));



  create policy "view paygroup_employees"
  on "public"."paygroup_employees"
  as permissive
  for select
  to public
using (((auth.uid() IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = ANY (ARRAY['super_admin'::public.app_role, 'admin'::public.app_role, 'manager'::public.app_role])))) OR (assigned_by = auth.uid())));



  create policy "Categories mapping manageable by admins"
  on "public"."payroll_approval_categories"
  as permissive
  for all
  to public
using (((config_id IN ( SELECT payroll_approval_configs.id
   FROM public.payroll_approval_configs
  WHERE (payroll_approval_configs.organization_id IN ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid()))))) AND (public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid()))));



  create policy "Categories mapping viewable by org members"
  on "public"."payroll_approval_categories"
  as permissive
  for select
  to public
using ((config_id IN ( SELECT payroll_approval_configs.id
   FROM public.payroll_approval_configs
  WHERE (payroll_approval_configs.organization_id IN ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid()))))));



  create policy "Configs are manageable by admins"
  on "public"."payroll_approval_configs"
  as permissive
  for all
  to public
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Configs are viewable by org members"
  on "public"."payroll_approval_configs"
  as permissive
  for select
  to public
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Allow authenticated users to manage payroll configs"
  on "public"."payroll_configurations"
  as permissive
  for all
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Allow authenticated users to view payroll configs"
  on "public"."payroll_configurations"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Approval Steps Readable by Relevant Users"
  on "public"."payrun_approval_steps"
  as permissive
  for select
  to authenticated
using ((public.check_is_org_admin(auth.uid()) OR (approver_user_id = auth.uid()) OR (original_approver_id = auth.uid()) OR (payrun_id IN ( SELECT pay_runs.id
   FROM public.pay_runs
  WHERE (pay_runs.created_by = auth.uid())))));



  create policy "Approvers Can Act on Their Steps"
  on "public"."payrun_approval_steps"
  as permissive
  for update
  to authenticated
using (((approver_user_id = auth.uid()) OR public.check_is_org_admin(auth.uid())))
with check (((approver_user_id = auth.uid()) OR public.check_is_org_admin(auth.uid())));



  create policy "payrun_employees_no_client_write"
  on "public"."payrun_employees"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "payrun_employees_select_authenticated"
  on "public"."payrun_employees"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.is_active = true)))));



  create policy "System can manage permission cache"
  on "public"."permission_cache"
  as permissive
  for all
  to public
using (true);



  create policy "Users can view their own permission cache"
  on "public"."permission_cache"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Platform admins readable by platform admins"
  on "public"."platform_admins"
  as permissive
  for select
  to authenticated
using (((auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.platform_admins platform_admins_1
  WHERE ((platform_admins_1.auth_user_id = auth.uid()) AND (platform_admins_1.allowed = true))))));



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id));



  create policy "Users can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all access to projects"
  on "public"."projects"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Admins can manage role assignments"
  on "public"."rbac_assignments"
  as permissive
  for all
  to public
using (public.has_permission(auth.uid(), 'admin.assign_roles'::text));



  create policy "Users can view their own role assignments"
  on "public"."rbac_assignments"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.has_permission(auth.uid(), 'admin.manage_users'::text)));



  create policy "Admins can view all role assignments"
  on "public"."role_assignments"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



  create policy "Users can view their own role assignments"
  on "public"."role_assignments"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own settings"
  on "public"."settings"
  as permissive
  for delete
  to public
using (((auth.uid() = user_id) OR (user_id IS NULL)));



  create policy "Users can insert their own settings"
  on "public"."settings"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) OR (user_id IS NULL)));



  create policy "Users can update their own settings"
  on "public"."settings"
  as permissive
  for update
  to public
using (((auth.uid() = user_id) OR (user_id IS NULL)));



  create policy "Users can view their own settings"
  on "public"."settings"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (user_id IS NULL)));



  create policy "Enable delete access for authenticated users"
  on "public"."sub_departments"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Enable insert access for authenticated users"
  on "public"."sub_departments"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for authenticated users"
  on "public"."sub_departments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Enable update access for authenticated users"
  on "public"."sub_departments"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Org Admins manage their settings"
  on "public"."tenant_email_settings"
  as permissive
  for all
  to public
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));



  create policy "Allow Org Admins to Insert Memberships"
  on "public"."user_company_memberships"
  as permissive
  for insert
  to authenticated
with check ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text, 'org_admin'::text, 'org_owner'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))));



  create policy "ucm_admin_delete"
  on "public"."user_company_memberships"
  as permissive
  for delete
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))));



  create policy "ucm_admin_insert"
  on "public"."user_company_memberships"
  as permissive
  for insert
  to authenticated
with check ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))));



  create policy "ucm_admin_update"
  on "public"."user_company_memberships"
  as permissive
  for update
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))))
with check ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))));



  create policy "ucm_manage_org_admin"
  on "public"."user_company_memberships"
  as permissive
  for all
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))))
with check ((((auth.jwt() ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'organization_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = user_company_memberships.company_id) AND (c.organization_id = ((auth.jwt() ->> 'organization_id'::text))::uuid))))));



  create policy "ucm_select_own"
  on "public"."user_company_memberships"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Admins and Inviter can update invites (revoke)"
  on "public"."user_invites"
  as permissive
  for update
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.platform_admins
  WHERE ((platform_admins.auth_user_id = auth.uid()) AND (platform_admins.allowed = true)))) OR ((tenant_id IS NOT NULL) AND public.is_org_admin(tenant_id)) OR (inviter_id = auth.uid())))
with check (((EXISTS ( SELECT 1
   FROM public.platform_admins
  WHERE ((platform_admins.auth_user_id = auth.uid()) AND (platform_admins.allowed = true)))) OR ((tenant_id IS NOT NULL) AND public.is_org_admin(tenant_id)) OR (inviter_id = auth.uid())));



  create policy "Admins can delete invites"
  on "public"."user_invites"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Admins can insert invites"
  on "public"."user_invites"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Admins can view all invites"
  on "public"."user_invites"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Users can manage their own preferences"
  on "public"."user_preferences"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "user_profiles_mutate_own_or_super_admin"
  on "public"."user_profiles"
  as permissive
  for all
  to authenticated
using ((((auth.jwt() ->> 'role'::text) = 'super_admin'::text) OR (id = auth.uid())))
with check ((((auth.jwt() ->> 'role'::text) = 'super_admin'::text) OR (id = auth.uid())));



  create policy "Super admins can manage all roles"
  on "public"."user_roles"
  as permissive
  for all
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role))
with check (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Super admins can view all roles"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'super_admin'::public.app_role));



  create policy "Users can view own roles"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Admins can view all sessions"
  on "public"."user_sessions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::text[]))))));



  create policy "Users can view their own sessions"
  on "public"."user_sessions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own data"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Org admins can update anomalies"
  on "public"."anomaly_logs"
  as permissive
  for update
  to authenticated
using ((public.is_platform_admin(auth.uid()) OR public.check_is_org_admin(auth.uid())));



  create policy "Org members can view anomalies"
  on "public"."anomaly_logs"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(organization_id)));



  create policy "System can insert anomalies"
  on "public"."anomaly_logs"
  as permissive
  for insert
  to authenticated
with check ((public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(organization_id)));



  create policy "Workflow Versions Managed by Admins"
  on "public"."approval_workflow_versions"
  as permissive
  for insert
  to authenticated
with check ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Workflow Versions Readable by Org Members"
  on "public"."approval_workflow_versions"
  as permissive
  for select
  to authenticated
using ((workflow_id IN ( SELECT approval_workflows.id
   FROM public.approval_workflows
  WHERE (approval_workflows.org_id IN ( SELECT users.organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));



  create policy "admins_manage_daily_summary"
  on "public"."attendance_daily_summary"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "read_own_daily_summary"
  on "public"."attendance_daily_summary"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_devices"
  on "public"."attendance_devices"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "manage_own_devices"
  on "public"."attendance_devices"
  as permissive
  for insert
  to authenticated
with check (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "read_own_devices"
  on "public"."attendance_devices"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_policies"
  on "public"."attendance_policies"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "org_members_read_policies"
  on "public"."attendance_policies"
  as permissive
  for select
  to authenticated
using ((public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_regularization"
  on "public"."attendance_regularization_requests"
  as permissive
  for update
  to authenticated
using (public.check_is_org_admin(auth.uid()));



  create policy "employees_create_regularization"
  on "public"."attendance_regularization_requests"
  as permissive
  for insert
  to authenticated
with check (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "read_own_regularization"
  on "public"."attendance_regularization_requests"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_shift_assignments"
  on "public"."attendance_shift_assignments"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "read_shift_assignments"
  on "public"."attendance_shift_assignments"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_shifts"
  on "public"."attendance_shifts"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "org_members_read_shifts"
  on "public"."attendance_shifts"
  as permissive
  for select
  to authenticated
using ((public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_delete_time_logs"
  on "public"."attendance_time_logs"
  as permissive
  for delete
  to authenticated
using (public.check_is_org_admin(auth.uid()));



  create policy "admins_update_time_logs"
  on "public"."attendance_time_logs"
  as permissive
  for update
  to authenticated
using (public.check_is_org_admin(auth.uid()));



  create policy "employees_insert_own_time_logs"
  on "public"."attendance_time_logs"
  as permissive
  for insert
  to authenticated
with check (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "employees_read_own_time_logs"
  on "public"."attendance_time_logs"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "cleanup_logs_platform_admin_select"
  on "public"."cleanup_logs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.platform_admins pa
  WHERE ((pa.allowed = true) AND ((pa.auth_user_id = auth.uid()) OR (lower(pa.email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))))));



  create policy "companies_select_policy"
  on "public"."companies"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text))::uuid) AND public.has_permission('companies.view'::text, 'COMPANY'::text, id))));



  create policy "Org admins can manage templates"
  on "public"."contract_templates"
  as permissive
  for all
  to public
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));



  create policy "Org members can view templates"
  on "public"."contract_templates"
  as permissive
  for select
  to public
using ((organization_id = public.current_org_id()));



  create policy "Designations managed by admins"
  on "public"."designations"
  as permissive
  for all
  to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));



  create policy "Designations readable by org members"
  on "public"."designations"
  as permissive
  for select
  to authenticated
using ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_compliance_requirements"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "ehs_corrective_actions_org_access"
  on "public"."ehs_corrective_actions"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_emergency_drills"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_environmental_incidents"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "ehs_hazards_org_access"
  on "public"."ehs_hazards"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "ehs_incidents_org_access"
  on "public"."ehs_incidents"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "ehs_inspection_items_access"
  on "public"."ehs_inspection_items"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.ehs_inspections i
  WHERE ((i.id = ehs_inspection_items.inspection_id) AND (i.organization_id = public.current_org_id())))));



  create policy "ehs_inspection_templates_org_access"
  on "public"."ehs_inspection_templates"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "ehs_inspections_org_access"
  on "public"."ehs_inspections"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_permits"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_ppe_records"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_ppe_types"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "org_access"
  on "public"."ehs_risk_assessment_items"
  as permissive
  for all
  to authenticated
using ((assessment_id IN ( SELECT ehs_risk_assessments.id
   FROM public.ehs_risk_assessments
  WHERE (ehs_risk_assessments.organization_id = public.current_org_id()))))
with check ((assessment_id IN ( SELECT ehs_risk_assessments.id
   FROM public.ehs_risk_assessments
  WHERE (ehs_risk_assessments.organization_id = public.current_org_id()))));



  create policy "org_access"
  on "public"."ehs_risk_assessments"
  as permissive
  for all
  to authenticated
using ((organization_id = public.current_org_id()))
with check ((organization_id = public.current_org_id()));



  create policy "ehs_training_records_org_access"
  on "public"."ehs_training_records"
  as permissive
  for all
  to public
using ((organization_id = public.current_org_id()));



  create policy "Org members can manage employee addresses"
  on "public"."employee_addresses"
  as permissive
  for all
  to public
using (public.user_belongs_to_org(organization_id))
with check (public.user_belongs_to_org(organization_id));



  create policy "Org admins can manage contracts"
  on "public"."employee_contracts"
  as permissive
  for all
  to public
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));



  create policy "Org members can view contracts"
  on "public"."employee_contracts"
  as permissive
  for select
  to public
using ((organization_id = public.current_org_id()));



  create policy "Org members can manage employee dependents"
  on "public"."employee_dependents"
  as permissive
  for all
  to public
using (public.user_belongs_to_org(organization_id))
with check (public.user_belongs_to_org(organization_id));



  create policy "Org members can manage employee documents"
  on "public"."employee_documents"
  as permissive
  for all
  to public
using (public.user_belongs_to_org(organization_id))
with check (public.user_belongs_to_org(organization_id));



  create policy "Org members can manage employee education"
  on "public"."employee_education"
  as permissive
  for all
  to public
using (public.user_belongs_to_org(organization_id))
with check (public.user_belongs_to_org(organization_id));



  create policy "Org members can read employee external IDs"
  on "public"."employee_external_ids"
  as permissive
  for select
  to public
using (public.user_belongs_to_org(organization_id));



  create policy "admins_manage_employee_geofences"
  on "public"."employee_geofences"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "read_employee_geofences"
  on "public"."employee_geofences"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "admins_manage_time_policies"
  on "public"."employee_time_policies"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "read_own_time_policy"
  on "public"."employee_time_policies"
  as permissive
  for select
  to authenticated
using (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) OR public.check_is_org_admin(auth.uid())));



  create policy "Org members can manage employee work experience"
  on "public"."employee_work_experience"
  as permissive
  for all
  to public
using (public.user_belongs_to_org(organization_id))
with check (public.user_belongs_to_org(organization_id));



  create policy "employees_select_policy"
  on "public"."employees"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text))::uuid) AND (public.has_permission('people.view'::text, 'ORGANIZATION'::text, organization_id) OR ((company_id IS NOT NULL) AND public.has_permission('people.view'::text, 'COMPANY'::text, company_id))))));



  create policy "admins_manage_geofences"
  on "public"."geofences"
  as permissive
  for all
  to authenticated
using (public.check_is_org_admin(auth.uid()))
with check (public.check_is_org_admin(auth.uid()));



  create policy "org_members_read_geofences"
  on "public"."geofences"
  as permissive
  for select
  to authenticated
using ((public.user_belongs_to_org(organization_id) OR public.check_is_org_admin(auth.uid())));



  create policy "items_catalog_delete"
  on "public"."items_catalog"
  as permissive
  for delete
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "items_catalog_insert"
  on "public"."items_catalog"
  as permissive
  for insert
  to public
with check ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "items_catalog_select"
  on "public"."items_catalog"
  as permissive
  for select
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "items_catalog_update"
  on "public"."items_catalog"
  as permissive
  for update
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "Users can delete locations in their org"
  on "public"."locations"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "Users can insert locations in their org"
  on "public"."locations"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_org(organization_id));



  create policy "Users can update locations in their org"
  on "public"."locations"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "Users can view locations in their org"
  on "public"."locations"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "Templates managed by Org Admins"
  on "public"."notification_templates"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Templates readable by Org Members"
  on "public"."notification_templates"
  as permissive
  for select
  to authenticated
using (((org_id IS NULL) OR (org_id IN ( SELECT users.organization_id
   FROM public.users
  WHERE (users.id = auth.uid())
UNION
 SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())))));



  create policy "Users can delete departments in their org"
  on "public"."org_departments"
  as permissive
  for delete
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "Users can insert departments in their org"
  on "public"."org_departments"
  as permissive
  for insert
  to authenticated
with check (public.user_belongs_to_org(organization_id));



  create policy "Users can update departments in their org"
  on "public"."org_departments"
  as permissive
  for update
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "Users can view departments in their org"
  on "public"."org_departments"
  as permissive
  for select
  to authenticated
using (public.user_belongs_to_org(organization_id));



  create policy "organizations_select_policy"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR public.has_permission('organizations.view'::text, 'ORGANIZATION'::text, id)));



  create policy "pay_runs_select_policy"
  on "public"."pay_runs"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text))::uuid) AND public.has_permission('payroll.view'::text, 'ORGANIZATION'::text, organization_id))));



  create policy "Categories Managed by Admins"
  on "public"."payroll_approval_categories"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Categories Readable by Org Members"
  on "public"."payroll_approval_categories"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.payroll_approval_configs c
  WHERE ((c.id = payroll_approval_categories.config_id) AND (c.organization_id IN ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
        UNION
         SELECT users.organization_id
           FROM public.users
          WHERE (users.id = auth.uid())))))));



  create policy "Configs Managed by Admins"
  on "public"."payroll_approval_configs"
  as permissive
  for all
  to authenticated
using ((public.check_is_super_admin(auth.uid()) OR public.check_is_org_super_admin(auth.uid())));



  create policy "Configs Readable by Org Members"
  on "public"."payroll_approval_configs"
  as permissive
  for select
  to authenticated
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
UNION
 SELECT users.organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));



  create policy "Users can manage payroll_benefits for their org pay runs"
  on "public"."payroll_benefits"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.pay_runs pr
  WHERE ((pr.id = payroll_benefits.payrun_id) AND (public.is_platform_admin() OR (pr.organization_id = public.current_org_id()))))))
with check ((EXISTS ( SELECT 1
   FROM public.pay_runs pr
  WHERE ((pr.id = payroll_benefits.payrun_id) AND (public.is_platform_admin() OR (pr.organization_id = public.current_org_id()))))));



  create policy "payrun_approvals_delete"
  on "public"."payrun_approvals"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((public.pay_runs pr
     JOIN public.pay_groups pg ON ((pg.id = pr.pay_group_id)))
     JOIN public.companies c ON ((c.organization_id = pg.organization_id)))
  WHERE ((pr.id = payrun_approvals.payrun_id) AND public.has_company_membership(c.id)))));



  create policy "payrun_approvals_insert"
  on "public"."payrun_approvals"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM ((public.pay_runs pr
     JOIN public.pay_groups pg ON ((pg.id = pr.pay_group_id)))
     JOIN public.companies c ON ((c.organization_id = pg.organization_id)))
  WHERE ((pr.id = payrun_approvals.payrun_id) AND public.has_company_membership(c.id)))));



  create policy "payrun_approvals_select"
  on "public"."payrun_approvals"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((public.pay_runs pr
     JOIN public.pay_groups pg ON ((pg.id = pr.pay_group_id)))
     JOIN public.companies c ON ((c.organization_id = pg.organization_id)))
  WHERE ((pr.id = payrun_approvals.payrun_id) AND public.has_company_membership(c.id)))));



  create policy "payrun_approvals_update"
  on "public"."payrun_approvals"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((public.pay_runs pr
     JOIN public.pay_groups pg ON ((pg.id = pr.pay_group_id)))
     JOIN public.companies c ON ((c.organization_id = pg.organization_id)))
  WHERE ((pr.id = payrun_approvals.payrun_id) AND public.has_company_membership(c.id)))))
with check ((EXISTS ( SELECT 1
   FROM ((public.pay_runs pr
     JOIN public.pay_groups pg ON ((pg.id = pr.pay_group_id)))
     JOIN public.companies c ON ((c.organization_id = pg.organization_id)))
  WHERE ((pr.id = payrun_approvals.payrun_id) AND public.has_company_membership(c.id)))));



  create policy "payrun_workflow_approvers_delete"
  on "public"."payrun_workflow_approvers"
  as permissive
  for delete
  to authenticated
using (public.has_company_membership(company_id));



  create policy "payrun_workflow_approvers_insert"
  on "public"."payrun_workflow_approvers"
  as permissive
  for insert
  to authenticated
with check (public.has_company_membership(company_id));



  create policy "payrun_workflow_approvers_select"
  on "public"."payrun_workflow_approvers"
  as permissive
  for select
  to authenticated
using (public.has_company_membership(company_id));



  create policy "payrun_workflow_approvers_update"
  on "public"."payrun_workflow_approvers"
  as permissive
  for update
  to authenticated
using (public.has_company_membership(company_id))
with check (public.has_company_membership(company_id));



  create policy "Users can view payslip generations for their templates"
  on "public"."payslip_generations"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.payslip_templates
  WHERE ((payslip_templates.id = payslip_generations.template_id) AND (payslip_templates.user_id = auth.uid())))));



  create policy "org_members_view_reminder_logs"
  on "public"."probation_reminder_logs"
  as permissive
  for select
  to authenticated
using ((organization_id = public.current_org_id()));



  create policy "projects_select_policy"
  on "public"."projects"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR ((organization_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text))::uuid) AND public.has_permission('projects.view'::text, 'PROJECT'::text, id))));



  create policy "Super admins can view all rbac assignments"
  on "public"."rbac_assignments"
  as permissive
  for all
  to authenticated
using (public.check_is_super_admin(auth.uid()));



  create policy "rbac_assignments_select_policy"
  on "public"."rbac_assignments"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR (user_id = auth.uid()) OR public.has_permission('admin.manage_users'::text, 'ORGANIZATION'::text, org_id)));



  create policy "rbac_permissions_delete"
  on "public"."rbac_permissions"
  as permissive
  for delete
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_permissions_insert"
  on "public"."rbac_permissions"
  as permissive
  for insert
  to authenticated
with check (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_permissions_update"
  on "public"."rbac_permissions"
  as permissive
  for update
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_role_permissions_delete"
  on "public"."rbac_role_permissions"
  as permissive
  for delete
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_role_permissions_insert"
  on "public"."rbac_role_permissions"
  as permissive
  for insert
  to authenticated
with check (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_role_permissions_update"
  on "public"."rbac_role_permissions"
  as permissive
  for update
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_roles_delete"
  on "public"."rbac_roles"
  as permissive
  for delete
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_roles_insert"
  on "public"."rbac_roles"
  as permissive
  for insert
  to authenticated
with check (public.check_is_org_super_admin(auth.uid()));



  create policy "rbac_roles_update"
  on "public"."rbac_roles"
  as permissive
  for update
  to authenticated
using (public.check_is_org_super_admin(auth.uid()));



  create policy "Org admins manage reminder rules"
  on "public"."reminder_rules"
  as permissive
  for all
  to public
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));



  create policy "Org members can read sync configurations"
  on "public"."sync_configurations"
  as permissive
  for select
  to public
using (((organization_id IS NOT NULL) AND public.user_belongs_to_org(organization_id)));



  create policy "Org members can read sync logs"
  on "public"."sync_logs"
  as permissive
  for select
  to public
using (((organization_id IS NOT NULL) AND public.user_belongs_to_org(organization_id)));



  create policy "Employees manage own time entries"
  on "public"."time_tracking_entries"
  as permissive
  for all
  to authenticated
using ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))))
with check ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));



  create policy "Org admins view all time entries"
  on "public"."time_tracking_entries"
  as permissive
  for select
  to authenticated
using (public.is_org_admin(organization_id));



  create policy "Org admins can manage departments"
  on "public"."timesheet_departments"
  as permissive
  for all
  to public
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))))
with check ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Org members can read departments"
  on "public"."timesheet_departments"
  as permissive
  for select
  to public
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Employees can manage own entries"
  on "public"."timesheet_entries"
  as permissive
  for all
  to public
using ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))))
with check ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));



  create policy "Org admins can view all entries"
  on "public"."timesheet_entries"
  as permissive
  for select
  to public
using ((timesheet_id IN ( SELECT t.id
   FROM (public.timesheets t
     JOIN public.user_profiles up ON ((up.organization_id = t.organization_id)))
  WHERE (up.id = auth.uid()))));



  create policy "Employees can manage own timesheets"
  on "public"."timesheets"
  as permissive
  for all
  to public
using ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))))
with check ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));



  create policy "Org admins can update timesheets"
  on "public"."timesheets"
  as permissive
  for update
  to public
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Org admins can view all timesheets"
  on "public"."timesheets"
  as permissive
  for select
  to public
using ((organization_id IN ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid()))));



  create policy "Admins and HR can view invitations"
  on "public"."user_management_invitations"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'hr'::text, 'super_admin'::text, 'org_admin'::text, 'organization_admin'::text]))))));



  create policy "org_admins_hr_read_user_management_profiles"
  on "public"."user_management_profiles"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'hr'::text, 'super_admin'::text]))))));



  create policy "Org Admins can view profiles in their organization"
  on "public"."user_profiles"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_admin(organization_id))));



  create policy "Organization admins can view organization users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((public.check_is_org_super_admin(auth.uid()) AND (organization_id = public.get_user_organization_id(auth.uid()))));



  create policy "Sub-Department managers can view sub-department users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((public.check_is_org_admin(auth.uid()) AND ((sub_department_id)::text = public.get_user_sub_department_id(auth.uid()))));



  create policy "Super admins can view all users"
  on "public"."users"
  as permissive
  for all
  to authenticated
using (public.check_is_super_admin(auth.uid()));



  create policy "variable_item_logs_delete"
  on "public"."variable_item_logs"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_item_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_item_logs_insert"
  on "public"."variable_item_logs"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_item_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_item_logs_select"
  on "public"."variable_item_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_item_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_item_logs_update"
  on "public"."variable_item_logs"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_item_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_pay_cycles_delete"
  on "public"."variable_pay_cycles"
  as permissive
  for delete
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "variable_pay_cycles_insert"
  on "public"."variable_pay_cycles"
  as permissive
  for insert
  to public
with check ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "variable_pay_cycles_select"
  on "public"."variable_pay_cycles"
  as permissive
  for select
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "variable_pay_cycles_update"
  on "public"."variable_pay_cycles"
  as permissive
  for update
  to public
using ((organization_id = ( SELECT user_profiles.organization_id
   FROM public.user_profiles
  WHERE (user_profiles.id = auth.uid())
 LIMIT 1)));



  create policy "variable_pay_summaries_insert"
  on "public"."variable_pay_summaries"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_pay_summaries.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_pay_summaries_select"
  on "public"."variable_pay_summaries"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_pay_summaries.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_pay_summaries_update"
  on "public"."variable_pay_summaries"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_pay_summaries.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_work_logs_delete"
  on "public"."variable_work_logs"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_work_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_work_logs_insert"
  on "public"."variable_work_logs"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_work_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_work_logs_select"
  on "public"."variable_work_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_work_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));



  create policy "variable_work_logs_update"
  on "public"."variable_work_logs"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.variable_pay_cycles vpc
  WHERE ((vpc.id = variable_work_logs.cycle_id) AND (vpc.organization_id = ( SELECT user_profiles.organization_id
           FROM public.user_profiles
          WHERE (user_profiles.id = auth.uid())
         LIMIT 1))))));


CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON ippms.ippms_attendance_records FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_employee_shifts_updated_at BEFORE UPDATE ON ippms.ippms_employee_shifts FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_holidays_updated_at BEFORE UPDATE ON ippms.ippms_holidays FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON ippms.ippms_leave_requests FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_leave_types_updated_at BEFORE UPDATE ON ippms.ippms_leave_types FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_piece_entries_updated_at BEFORE UPDATE ON ippms.ippms_piece_work_entries FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_piece_rates_updated_at BEFORE UPDATE ON ippms.ippms_piece_work_rates FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_shifts_updated_at BEFORE UPDATE ON ippms.ippms_shifts FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_work_days_updated_at BEFORE UPDATE ON ippms.ippms_work_days FOR EACH ROW EXECUTE FUNCTION ippms.tg_set_updated_at();

CREATE TRIGGER trg_audit_access_grants AFTER INSERT OR DELETE OR UPDATE ON public.access_grants FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER update_banks_updated_at_trigger BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION public.update_banks_updated_at();

CREATE TRIGGER trg_audit_org_license_assignments AFTER INSERT OR DELETE OR UPDATE ON public.org_license_assignments FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER trg_audit_org_licenses AFTER INSERT OR UPDATE ON public.org_licenses FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER trg_audit_org_user_roles AFTER INSERT OR DELETE ON public.org_user_roles FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER trg_audit_org_users AFTER INSERT OR DELETE OR UPDATE ON public.org_users FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER trg_sync_legacy_pay_group_id BEFORE INSERT OR UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_pay_group_id();

CREATE TRIGGER trg_sync_pay_group_columns BEFORE INSERT OR UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.sync_pay_group_columns();

CREATE TRIGGER trg_enforce_unique_paygroup BEFORE INSERT OR UPDATE ON public.paygroup_employees FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_paygroup_assignment();

CREATE TRIGGER trg_validate_paygroup_employees_pay_group_id BEFORE INSERT OR UPDATE ON public.paygroup_employees FOR EACH ROW EXECUTE FUNCTION public.validate_paygroup_employees_pay_group_id();

CREATE TRIGGER trg_validate_single_paygroup BEFORE INSERT OR UPDATE ON public.paygroup_employees FOR EACH ROW EXECUTE FUNCTION public.validate_single_paygroup_assignment();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rbac_assignments_sync_jwt AFTER INSERT OR DELETE OR UPDATE ON public.rbac_assignments FOR EACH ROW EXECUTE FUNCTION public.sync_rbac_to_jwt();

CREATE TRIGGER set_sub_departments_updated_at BEFORE UPDATE ON public.sub_departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_audit_user_company_memberships AFTER INSERT OR DELETE OR UPDATE ON public.user_company_memberships FOR EACH ROW EXECUTE FUNCTION public.log_access_control_audit();

CREATE TRIGGER set_anomaly_logs_updated_at BEFORE UPDATE ON public.anomaly_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_approval_groups_updated_at BEFORE UPDATE ON public.approval_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_approval_workflow_followups_updated_at BEFORE UPDATE ON public.approval_workflow_followups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_approval_workflow_messages_updated_at BEFORE UPDATE ON public.approval_workflow_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER tr_workflow_version_snapshot AFTER INSERT OR UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.create_workflow_version_snapshot();

CREATE TRIGGER set_daily_summary_updated_at BEFORE UPDATE ON public.attendance_daily_summary FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_attendance_policies_updated_at BEFORE UPDATE ON public.attendance_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_regularization_updated_at BEFORE UPDATE ON public.attendance_regularization_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_shift_assignments_updated_at BEFORE UPDATE ON public.attendance_shift_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_attendance_shifts_updated_at BEFORE UPDATE ON public.attendance_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_attendance_time_logs_updated_at BEFORE UPDATE ON public.attendance_time_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_compute_daily_summary_insert AFTER INSERT ON public.attendance_time_logs FOR EACH ROW EXECUTE FUNCTION public.compute_attendance_daily_summary();

CREATE TRIGGER trg_compute_daily_summary_update AFTER UPDATE ON public.attendance_time_logs FOR EACH ROW EXECUTE FUNCTION public.compute_attendance_daily_summary();

CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON public.benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_designations_updated_at BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_compliance_updated_at BEFORE UPDATE ON public.ehs_compliance_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_corrective_actions_updated_at BEFORE UPDATE ON public.ehs_corrective_actions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_drills_updated_at BEFORE UPDATE ON public.ehs_emergency_drills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_env_incidents_updated_at BEFORE UPDATE ON public.ehs_environmental_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_env_incident_number BEFORE INSERT ON public.ehs_environmental_incidents FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_env_incident_number();

CREATE TRIGGER trg_ehs_hazard_number BEFORE INSERT ON public.ehs_hazards FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_hazard_number();

CREATE TRIGGER trg_ehs_hazards_updated_at BEFORE UPDATE ON public.ehs_hazards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_incident_number BEFORE INSERT ON public.ehs_incidents FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_incident_number();

CREATE TRIGGER trg_ehs_incidents_updated_at BEFORE UPDATE ON public.ehs_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_inspection_templates_updated_at BEFORE UPDATE ON public.ehs_inspection_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_inspection_number BEFORE INSERT ON public.ehs_inspections FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_inspection_number();

CREATE TRIGGER trg_ehs_inspections_updated_at BEFORE UPDATE ON public.ehs_inspections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_permits_updated_at BEFORE UPDATE ON public.ehs_permits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_permit_number BEFORE INSERT ON public.ehs_permits FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_permit_number();

CREATE TRIGGER set_ehs_ppe_records_updated_at BEFORE UPDATE ON public.ehs_ppe_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_ppe_types_updated_at BEFORE UPDATE ON public.ehs_ppe_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ehs_risk_assessments_updated_at BEFORE UPDATE ON public.ehs_risk_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_ehs_assessment_number BEFORE INSERT ON public.ehs_risk_assessments FOR EACH ROW EXECUTE FUNCTION public.ehs_generate_assessment_number();

CREATE TRIGGER trg_ehs_training_records_updated_at BEFORE UPDATE ON public.ehs_training_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER update_employee_contracts_updated_at BEFORE UPDATE ON public.employee_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_number_settings_updated_at BEFORE UPDATE ON public.employee_number_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_employee_time_policies_updated_at BEFORE UPDATE ON public.employee_time_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_log_employee_number_change AFTER UPDATE OF employee_number ON public.employees FOR EACH ROW EXECUTE FUNCTION public.log_employee_number_change();

CREATE TRIGGER trg_set_employee_number_before_insert BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_employee_number_before_insert();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expatriate_policies_updated_at BEFORE UPDATE ON public.expatriate_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_geofences_updated_at BEFORE UPDATE ON public.geofences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_ippms_timesheet_updated_at BEFORE UPDATE ON public.ippms_daily_timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_items_catalog_updated_at BEFORE UPDATE ON public.items_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER set_org_departments_updated_at BEFORE UPDATE ON public.org_departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER update_pay_groups_updated_at BEFORE UPDATE ON public.pay_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pay_items_updated_at BEFORE UPDATE ON public.pay_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_enforce_pay_run_security BEFORE DELETE OR UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.enforce_pay_run_security();

CREATE TRIGGER update_pay_runs_updated_at BEFORE UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_payroll_approval_configs_updated_at BEFORE UPDATE ON public.payroll_approval_configs FOR EACH ROW EXECUTE FUNCTION public.handle_payroll_config_updated_at();

CREATE TRIGGER set_payroll_benefits_updated_at BEFORE UPDATE ON public.payroll_benefits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER update_payslip_templates_updated_at BEFORE UPDATE ON public.payslip_templates FOR EACH ROW EXECUTE FUNCTION public.update_payslip_templates_updated_at();

CREATE TRIGGER update_project_onboarding_steps_updated_at BEFORE UPDATE ON public.project_onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_create_project_onboarding_steps AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.create_project_onboarding_steps();

CREATE TRIGGER trg_update_project_onboarding_steps AFTER UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_project_onboarding_steps();

CREATE TRIGGER trg_audit_rbac_assignments AFTER INSERT OR DELETE OR UPDATE ON public.rbac_assignments FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_assignments();

CREATE TRIGGER trg_validate_rbac_assignment BEFORE INSERT OR UPDATE ON public.rbac_assignments FOR EACH ROW EXECUTE FUNCTION public.validate_rbac_assignment();

CREATE TRIGGER trg_audit_rbac_grants AFTER INSERT OR UPDATE ON public.rbac_grants FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_grants();

CREATE TRIGGER trg_audit_rbac_roles AFTER INSERT OR DELETE OR UPDATE ON public.rbac_roles FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_time_tracking_updated_at BEFORE UPDATE ON public.time_tracking_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER sync_timesheet_hours_after_entry AFTER INSERT OR DELETE OR UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.sync_timesheet_total_hours();

CREATE TRIGGER update_timesheet_entries_updated_at BEFORE UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_user_management_profiles_updated_at BEFORE UPDATE ON public.user_management_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_variable_item_logs_updated_at BEFORE UPDATE ON public.variable_item_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_variable_pay_cycles_updated_at BEFORE UPDATE ON public.variable_pay_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_variable_pay_summaries_updated_at BEFORE UPDATE ON public.variable_pay_summaries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

CREATE TRIGGER trg_variable_work_logs_updated_at BEFORE UPDATE ON public.variable_work_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

drop trigger if exists "on_auth_user_created" on "auth"."users";

drop trigger if exists "on_user_confirm_activate" on "auth"."users";

CREATE TRIGGER on_auth_user_email_update AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN (((old.email)::text IS DISTINCT FROM (new.email)::text)) EXECUTE FUNCTION public.sync_user_profile_email();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_user_confirm_activate AFTER UPDATE ON auth.users FOR EACH ROW WHEN ((old.confirmed_at IS DISTINCT FROM new.confirmed_at)) EXECUTE FUNCTION public.activate_invited_user();


