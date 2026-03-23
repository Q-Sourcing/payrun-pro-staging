-- START OF migration.sql


-- Create user-defined types (as observed). If a type already exists, these checks avoid error.
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payrunstatus')
THEN CREATE TYPE public.payrunstatus AS ENUM ('draft', 'pendingapproval', 'approved', 'processed');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payitemstatus')
THEN CREATE TYPE public.payitemstatus AS ENUM ('draft', 'pending', 'approved', 'paid');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paytype')
THEN CREATE TYPE public.paytype AS ENUM ('hourly', 'salary', 'piecerate', 'dailyrate');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payfrequency')
THEN CREATE TYPE public.payfrequency AS ENUM ('weekly', 'biweekly', 'monthly', 'dailyrate');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paygrouptype')
THEN CREATE TYPE public.paygrouptype AS ENUM ('local', 'expatriate', 'contractor', 'intern', 'temporary', 'Expatriate', 'Local');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'benefittype')
THEN CREATE TYPE public.benefittype AS ENUM ('healthinsurance', 'retirement', 'dental', 'vision', 'other');
END IF;
END;
$$;





-- Tables: create in dependency order where possible


CREATE TABLE IF NOT EXISTS public.users ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email character varying UNIQUE, first_name character varying, last_name character varying, role character varying NOT NULL CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying]::text[])), organization_id uuid, department_id character varying, manager_id uuid, is_active boolean DEFAULT true, last_login timestamptz, two_factor_enabled boolean DEFAULT false, session_timeout integer DEFAULT 480, permissions text[] DEFAULT '{}'::text[], restrictions text[] DEFAULT '{}'::text[], created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.employee_number_settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, number_format text DEFAULT 'PREFIX-SEQUENCE'::text, default_prefix text DEFAULT 'EMP'::text, sequence_digits integer DEFAULT 3 CHECK (sequence_digits >= 1 AND sequence_digits <= 10), use_department_prefix boolean DEFAULT false, include_country_code boolean DEFAULT false, use_employment_type boolean DEFAULT false, custom_prefix_per_pay_group boolean DEFAULT false, custom_format text, next_sequence integer DEFAULT 1 CHECK (next_sequence > 0), department_rules jsonb DEFAULT '{}'::jsonb, country_rules jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.database_health_log ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, check_date timestamptz DEFAULT now(), health_score integer, health_status text, critical_issues_count integer, total_checks integer, passed_checks integer, report_data jsonb );

CREATE TABLE IF NOT EXISTS public.pay_item_custom_deductions ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_item_id uuid, name text, amount numeric DEFAULT 0.00, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), type text DEFAULT 'deduction'::text CHECK (type = ANY (ARRAY['deduction'::text, 'benefit'::text, 'allowance'::text])) );

CREATE TABLE IF NOT EXISTS public.settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, category text, key text, value jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.integration_health ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, status character varying CHECK (status::text = ANY (ARRAY['healthy'::character varying, 'warning'::character varying, 'critical'::character varying]::text[])), last_sync timestamptz, uptime numeric DEFAULT 0, api_response_time integer DEFAULT 0, error_rate numeric DEFAULT 0, total_syncs integer DEFAULT 0, successful_syncs integer DEFAULT 0, failed_syncs integer DEFAULT 0, checked_at timestamptz, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.payrun_employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, pay_group_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.pay_runs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_date date DEFAULT CURRENT_DATE, pay_period_start date, pay_period_end date, pay_group_id uuid, status public.payrunstatus DEFAULT 'draft'::public.payrunstatus, total_gross_pay numeric DEFAULT 0.00, total_deductions numeric DEFAULT 0.00, total_net_pay numeric DEFAULT 0.00, approved_by uuid, approved_at timestamptz, created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), pay_run_id character varying UNIQUE );

CREATE TABLE IF NOT EXISTS public.pay_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, hours_worked numeric, pieces_completed integer, gross_pay numeric DEFAULT 0.00, tax_deduction numeric DEFAULT 0.00, benefit_deductions numeric DEFAULT 0.00, total_deductions numeric DEFAULT 0.00, net_pay numeric DEFAULT 0.00, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), status public.payitemstatus DEFAULT 'draft'::public.payitemstatus, employer_contributions numeric DEFAULT 0.00 );

CREATE TABLE IF NOT EXISTS public.pay_calculation_audit_log ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, pay_run_id uuid, input_data jsonb, output_data jsonb, calculation_type text DEFAULT 'payroll_calculation'::text, calculated_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.permission_cache ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, resource character varying, permission character varying, has_permission boolean, context jsonb DEFAULT '{}'::jsonb, expires_at timestamptz, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.paygroup_employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_group_id uuid, employee_id uuid, assigned_by uuid, assigned_at timestamptz DEFAULT now(), active boolean DEFAULT true, notes text );

CREATE TABLE IF NOT EXISTS public.pay_groups ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, country text, pay_frequency public.payfrequency DEFAULT 'monthly'::public.payfrequency, default_tax_percentage numeric DEFAULT 0.00, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), type public.paygrouptype DEFAULT 'local'::public.paygrouptype );

CREATE TABLE IF NOT EXISTS public.expatriate_pay_groups ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, paygroup_id text UNIQUE, name text, country text, currency text DEFAULT 'USD'::text, exchange_rate_to_local numeric DEFAULT 0, tax_country text, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.expatriate_pay_run_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, pay_run_id uuid, employee_id uuid, expatriate_pay_group_id uuid, daily_rate numeric, days_worked integer, allowances_foreign numeric DEFAULT 0, net_foreign numeric, net_local numeric, gross_local numeric, tax_country text, exchange_rate_to_local numeric, currency text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.payslip_templates ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, description text, config jsonb, user_id uuid, is_default boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.payslip_generations ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, template_id uuid, pay_run_id uuid, employee_id uuid, generated_at timestamptz DEFAULT now(), export_format text DEFAULT 'pdf'::text, file_size integer, created_by uuid );

CREATE TABLE IF NOT EXISTS public.user_preferences ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid UNIQUE, preferences jsonb DEFAULT '{}'::jsonb, dashboard_config jsonb DEFAULT '{}'::jsonb, notification_settings jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.profiles ( id uuid PRIMARY KEY, email text, first_name text, last_name text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.employees ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email text UNIQUE, phone text, pay_type public.paytype DEFAULT 'hourly'::public.paytype, pay_rate numeric, country text, pay_group_id uuid, status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])), user_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), first_name text, middle_name text, last_name text, currency text, employee_type text DEFAULT 'local'::text CHECK (employee_type = ANY (ARRAY['local'::text, 'expatriate'::text])), gender text, date_of_birth date, national_id text, tin text, nssf_number text, passport_number text, bank_name text, bank_branch text, account_number text, account_type text, department text, project text, employee_number text, social_security_number text, employee_category text CHECK (employee_category IS NULL OR (employee_category = ANY (ARRAY['Intern'::text, 'Trainee'::text, 'Temporary'::text, 'Permanent'::text, 'On Contract'::text, 'Casual'::text]))), employment_status text DEFAULT 'Active'::text CHECK (employment_status = ANY (ARRAY['Active'::text, 'Terminated'::text, 'Deceased'::text, 'Resigned'::text, 'Probation'::text, 'Notice Period'::text])) );

CREATE TABLE IF NOT EXISTS public.attendance_records ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, date date, check_in time, check_out time, total_hours numeric DEFAULT 0, overtime_hours numeric DEFAULT 0, status character varying CHECK (status::text = ANY (ARRAY['present'::character varying, 'absent'::character varying, 'half-day'::character varying, 'holiday'::character varying]::text[])), leave_type character varying, remarks text, synced_from_zoho boolean DEFAULT false, synced_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.employee_number_history ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, employee_id uuid, old_employee_number text, new_employee_number text, changed_at timestamptz DEFAULT now(), changed_by uuid, reason text );

CREATE TABLE IF NOT EXISTS public.user_sessions ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, session_token character varying UNIQUE, ip_address inet, user_agent text, created_at timestamptz DEFAULT now(), expires_at timestamptz, is_active boolean DEFAULT true );

CREATE TABLE IF NOT EXISTS public.sync_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, sync_id character varying, type character varying, direction character varying, status character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])), started_at timestamptz, completed_at timestamptz, records_processed integer DEFAULT 0, records_failed integer DEFAULT 0, error_message text, retry_count integer DEFAULT 0, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.alert_rules ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, name character varying, condition character varying, threshold numeric, enabled boolean DEFAULT true, notification_channels text[] DEFAULT '{}'::text[], escalation_level integer DEFAULT 1, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.alert_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, rule_id uuid, rule_name character varying, integration_name character varying, status character varying, message text, triggered_at timestamptz, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.audit_logs ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, integration_name character varying, action character varying, user_id character varying, resource character varying, details jsonb DEFAULT '{}'::jsonb, ip_address inet, user_agent text, timestamp timestamptz, created_at timestamptz DEFAULT now(), result character varying CHECK (result::text = ANY (ARRAY['success'::character varying, 'failure'::character varying, 'denied'::character varying]::text[])) );

CREATE TABLE IF NOT EXISTS public.permission_cache ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, resource character varying, permission character varying, has_permission boolean, context jsonb DEFAULT '{}'::jsonb, expires_at timestamptz, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.payslip_generations ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, template_id uuid, pay_run_id uuid, employee_id uuid, generated_at timestamptz DEFAULT now(), export_format text DEFAULT 'pdf'::text, file_size integer, created_by uuid );

CREATE TABLE IF NOT EXISTS public.payslip_templates ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, description text, config jsonb, user_id uuid, is_default boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.company_settings ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, company_name text DEFAULT 'SimplePay Solutions'::text, address text, phone text, email text, website text, tax_id text, logo_url text, primary_color text DEFAULT '#3366CC'::text, secondary_color text DEFAULT '#666666'::text, accent_color text DEFAULT '#FF6B35'::text, include_logo boolean DEFAULT true, show_company_details boolean DEFAULT true, add_confidentiality_footer boolean DEFAULT true, include_generated_date boolean DEFAULT true, show_page_numbers boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.benefits ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, cost numeric, cost_type text DEFAULT 'fixed'::text CHECK (cost_type = ANY (ARRAY['fixed'::text, 'percentage'::text])), benefit_type public.benefittype DEFAULT 'other'::public.benefittype, applicable_countries text[] DEFAULT '{}'::text[], created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.lst_payment_plans ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, country text DEFAULT 'Uganda'::text, method text DEFAULT 'official_brackets'::text, annual_amount numeric DEFAULT 0, months integer DEFAULT 3 CHECK (months >= 1 AND months <= 24), distribution text DEFAULT 'equal'::text, custom_amounts jsonb, percentages jsonb, start_month date, apply_future boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.lst_employee_assignments ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, plan_id uuid, employee_id uuid, annual_amount numeric, months integer, start_month date, distribution text, custom_amounts jsonb, percentages jsonb, created_at timestamptz DEFAULT now() );

CREATE TABLE IF NOT EXISTS public.user_roles ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, role public.app_role, created_at timestamptz DEFAULT now() );

-- Note: public.app_role enum may be required — create if missing
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approle')
THEN CREATE TYPE public.approle AS ENUM ('superadmin', 'admin', 'manager', 'employee');
END IF;
END;
$$;



-- END OF migration.sql
