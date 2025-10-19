-- START OF migration.sql -- Create schemas CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS realtime; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS graphql; CREATE SCHEMA IF NOT EXISTS graphql_public; CREATE SCHEMA IF NOT EXISTS public;

-- Extensions (may require superuser) CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog; CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS uuid_ossp WITH SCHEMA extensions; CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_raster; CREATE EXTENSION IF NOT EXISTS postgis_sfcgal; CREATE EXTENSION IF NOT EXISTS postgis_topology; CREATE EXTENSION IF NOT EXISTS pgsodium; CREATE EXTENSION IF NOT EXISTS pgjwt; CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS hstore; CREATE EXTENSION IF NOT EXISTS file_fdw; CREATE EXTENSION IF NOT EXISTS postgres_fdw; CREATE EXTENSION IF NOT EXISTS pgrowlocks; CREATE EXTENSION IF NOT EXISTS pg_repack; CREATE EXTENSION IF NOT EXISTS pg_stat_monitor; CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS rum; CREATE EXTENSION IF NOT EXISTS btree_gin; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pg_buffercache; CREATE EXTENSION IF NOT EXISTS pg_prewarm; CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pgcrypto; -- repeated safe CREATE EXTENSION IF NOT EXISTS tablefunc; CREATE EXTENSION IF NOT EXISTS xml2; CREATE EXTENSION IF NOT EXISTS pgjwt; -- repeated safe

-- Create user-defined types (as observed). If a type already exists, these checks avoid error. DO 
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
-- Auth schema enums
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aallevel')
THEN CREATE TYPE auth.aallevel AS ENUM ('aal1', 'aal2', 'aal3');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factortype')
THEN CREATE TYPE auth.factortype AS ENUM ('totp', 'webauthn', 'phone');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factorstatus')
THEN CREATE TYPE auth.factorstatus AS ENUM ('unverified', 'verified');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauthresponsetype')
THEN CREATE TYPE auth.oauthresponsetype AS ENUM ('code');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauthclienttype')
THEN CREATE TYPE auth.oauthclienttype AS ENUM ('public', 'confidential');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauthregistrationtype')
THEN CREATE TYPE auth.oauthregistrationtype AS ENUM ('dynamic', 'manual');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'codechallengemethod')
THEN CREATE TYPE auth.codechallengemethod AS ENUM ('s256', 'plain');
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onetimetokentype')
THEN CREATE TYPE auth.onetimetokentype AS ENUM ('confirmationtoken', 'reauthenticationtoken', 'recoverytoken', 'emailchangetokennew', 'emailchangetokencurrent', 'phonechangetoken');
END IF;
END;

-- Sequences (ensure existence) DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'auth.refreshtokensidseq')
THEN CREATE SEQUENCE auth.refreshtokensidseq;
END IF;
END;

-- Functions (stubs or recreated where necessary) -- vault.crypto_aead_det_noncegen used as default DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cryptoaeaddetnoncegen' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'vault'))
THEN CREATE OR REPLACE FUNCTION vault.cryptoaeaddetnoncegen() RETURNS bytea LANGUAGE sql SECURITY DEFINER AS SELECT gen_random_bytes(12); 
;
END IF;
END;

-- storage.get_level used as default for storage.prefixes.level DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'getlevel' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage'))
THEN CREATE OR REPLACE FUNCTION storage.getlevel(nametext) RETURNS integer LANGUAGE sql STABLE AS SELECT 0; 
;
END IF;
END;

-- realtime.broadcast_changes exists in realtime schema in Supabase; create safe stub if missing DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'broadcastchanges' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'realtime'))
THEN CREATE OR REPLACE FUNCTION realtime.broadcastchanges(topictext,optext,eventtext,tablenametext,tableschematetext,newrowjsonb,oldrowjsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS BEGIN -- Stub: actual realtime.broadcast_changes is provided by Supabase realtime. This stub is no-op for local dev. RETURN; END; 
;
END IF;
END;

-- Example helper used in default for storage.objects path tokens: string_to_array built-in used, so no helper needed.

-- Tables: create in dependency order where possible

-- Schema: storage.prefixes CREATE TABLE IF NOT EXISTS storage.prefixes ( bucket_id text NOT NULL, name text NOT NULL, level integer NOT NULL DEFAULT storage.getlevel(name), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), PRIMARY KEY (bucket_id, name, level) );

-- Schema: storage.buckets (referenced by storage.prefixes and storage.objects) CREATE TYPE IF NOT EXISTS storage.buckettype AS ENUM ('STANDARD','ANALYTICS'); CREATE TABLE IF NOT EXISTS storage.buckets ( id text PRIMARY KEY, name text, owner uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), public boolean DEFAULT false, avif_autodetection boolean DEFAULT false, file_size_limit bigint, allowed_mime_types text[], owner_id text, type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype );

-- storage.objects CREATE TABLE IF NOT EXISTS storage.objects ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, bucket_id text, name text, owner uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), last_accessed_at timestamptz DEFAULT now(), metadata jsonb, path_tokens text[] DEFAULT string_to_array(name, '/'::text), version text, owner_id text, user_metadata jsonb, level integer );

-- storage.s3_multipart_uploads CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads ( id text PRIMARY KEY, in_progress_size bigint DEFAULT 0, upload_signature text, bucket_id text, key text, version text, owner_id text, created_at timestamptz DEFAULT now(), user_metadata jsonb );

-- storage.s3_multipart_uploads_parts CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, upload_id text, size bigint DEFAULT 0, part_number integer, bucket_id text, key text, etag text, owner_id text, version text, created_at timestamptz DEFAULT now() );

-- storage.buckets_analytics CREATE TABLE IF NOT EXISTS storage.buckets_analytics ( id text PRIMARY KEY, type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype, format text DEFAULT 'ICEBERG'::text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

-- storage.migrations CREATE TABLE IF NOT EXISTS storage.migrations ( id integer, name character varying UNIQUE, hash character varying, executed_at timestamp DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id) );

-- Schema: public (key tables) CREATE TABLE IF NOT EXISTS public.users ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email character varying UNIQUE, first_name character varying, last_name character varying, role character varying NOT NULL CHECK (role::text = ANY (ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying]::text[])), organization_id uuid, department_id character varying, manager_id uuid, is_active boolean DEFAULT true, last_login timestamptz, two_factor_enabled boolean DEFAULT false, session_timeout integer DEFAULT 480, permissions text[] DEFAULT '{}'::text[], restrictions text[] DEFAULT '{}'::text[], created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

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

-- Note: public.app_role enum may be required — create if missing DO 
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approle')
THEN CREATE TYPE public.approle AS ENUM ('superadmin', 'admin', 'manager', 'employee');
END IF;
END;

-- Schema: auth CREATE TABLE IF NOT EXISTS auth.users ( instance_id uuid, id uuid PRIMARY KEY, aud character varying, role character varying, email character varying, encrypted_password character varying, email_confirmed_at timestamptz, invited_at timestamptz, confirmation_token character varying, confirmation_sent_at timestamptz, recovery_token character varying, recovery_sent_at timestamptz, email_change_token_new character varying, email_change character varying, email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz, phone text UNIQUE DEFAULT NULL::character varying, phone_confirmed_at timestamptz, phone_change character varying DEFAULT ''::character varying, phone_change_token character varying DEFAULT ''::character varying, phone_change_sent_at timestamptz, confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED, email_change_token_current character varying DEFAULT ''::character varying, email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2), banned_until timestamptz, reauthentication_token character varying DEFAULT ''::character varying, reauthentication_sent_at timestamptz, is_sso_user boolean DEFAULT false, deleted_at timestamptz, is_anonymous boolean DEFAULT false );

CREATE TABLE IF NOT EXISTS auth.sessions ( id uuid PRIMARY KEY, user_id uuid, created_at timestamptz, updated_at timestamptz, factor_id uuid, aal auth.aallevel, not_after timestamptz, refreshed_at timestamp, user_agent text, ip inet, tag text, oauth_client_id uuid );

CREATE TABLE IF NOT EXISTS auth.identities ( provider_id text, user_id uuid, identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz, email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED, id uuid DEFAULT gen_random_uuid() PRIMARY KEY );

CREATE TABLE IF NOT EXISTS auth.one_time_tokens ( id uuid PRIMARY KEY, user_id uuid, token_type auth.onetimetokentype, token_hash text NOT NULL CHECK (char_length(token_hash) > 0), relates_to text, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now() );

CREATE TABLE IF NOT EXISTS auth.refresh_tokens ( instance_id uuid, id bigint DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass) PRIMARY KEY, token character varying UNIQUE, user_id character varying, revoked boolean, created_at timestamptz, updated_at timestamptz, parent character varying, session_id uuid );

CREATE TABLE IF NOT EXISTS auth.sso_providers ( id uuid PRIMARY KEY, resource_id text, created_at timestamptz, updated_at timestamptz, disabled boolean );

CREATE TABLE IF NOT EXISTS auth.saml_providers ( id uuid PRIMARY KEY, sso_provider_id uuid, entity_id text UNIQUE NOT NULL CHECK (char_length(entity_id) > 0), metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0), metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0), attribute_mapping jsonb, created_at timestamptz, updated_at timestamptz, name_id_format text );

CREATE TABLE IF NOT EXISTS auth.saml_relay_states ( id uuid PRIMARY KEY, sso_provider_id uuid, request_id text NOT NULL CHECK (char_length(request_id) > 0), for_email text, redirect_to text, created_at timestamptz, updated_at timestamptz, flow_state_id uuid );

CREATE TABLE IF NOT EXISTS auth.flow_state ( id uuid PRIMARY KEY, user_id uuid, auth_code text, code_challenge_method auth.codechallengemethod, code_challenge text, provider_type text, provider_access_token text, provider_refresh_token text, created_at timestamptz, updated_at timestamptz, authentication_method text, auth_code_issued_at timestamptz );

CREATE TABLE IF NOT EXISTS auth.mfa_factors ( id uuid PRIMARY KEY, user_id uuid, friendly_name text, factor_type auth.factortype, status auth.factorstatus, created_at timestamptz, updated_at timestamptz, secret text, phone text, last_challenged_at timestamptz UNIQUE, web_authn_credential jsonb, web_authn_aaguid uuid );

CREATE TABLE IF NOT EXISTS auth.mfa_challenges ( id uuid PRIMARY KEY, factor_id uuid, created_at timestamptz, verified_at timestamptz, ip_address inet, otp_code text, web_authn_session_data jsonb );

CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims ( id uuid PRIMARY KEY, session_id uuid, created_at timestamptz, updated_at timestamptz, authentication_method text );

CREATE TABLE IF NOT EXISTS auth.oauth_clients ( id uuid PRIMARY KEY, client_secret_hash text, registration_type auth.oauthregistrationtype, redirect_uris text, grant_types text, client_name text CHECK (char_length(client_name) <= 1024), client_uri text CHECK (char_length(client_uri) <= 2048), logo_uri text CHECK (char_length(logo_uri) <= 2048), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz, client_type auth.oauthclienttype DEFAULT 'confidential'::auth.oauthclienttype );

CREATE TABLE IF NOT EXISTS auth.oauth_authorizations ( id uuid PRIMARY KEY, authorization_id text UNIQUE, client_id uuid, user_id uuid, redirect_uri text CHECK (char_length(redirect_uri) <= 2048), scope text CHECK (char_length(scope) <= 4096), state text CHECK (char_length(state) <= 4096), resource text CHECK (char_length(resource) <= 2048), code_challenge text CHECK (char_length(code_challenge) <= 128), code_challenge_method auth.codechallengemethod, response_type auth.oauthresponsetype DEFAULT 'code'::auth.oauthresponsetype, status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status, authorization_code text UNIQUE CHECK (char_length(authorization_code) <= 255), created_at timestamptz DEFAULT now(), expires_at timestamptz DEFAULT (now() + '00:03:00'::interval), approved_at timestamptz );

-- auth.schema_migrations (tracks migrations in auth schema) CREATE TABLE IF NOT EXISTS auth.schema_migrations ( version character varying PRIMARY KEY );

-- auth.audit_log_entries CREATE TABLE IF NOT EXISTS auth.audit_log_entries ( instance_id uuid, id uuid PRIMARY KEY, payload json, created_at timestamptz, ip_address character varying DEFAULT ''::character varying );

CREATE TABLE IF NOT EXISTS auth.instances ( id uuid PRIMARY KEY, uuid uuid, raw_base_config text, created_at timestamptz, updated_at timestamptz );

CREATE TABLE IF NOT EXISTS auth.sso_domains ( id uuid PRIMARY KEY, sso_provider_id uuid, domain text NOT NULL CHECK (char_length(domain) > 0), created_at timestamptz, updated_at timestamptz );

CREATE TABLE IF NOT EXISTS auth.oauth_consents ( id uuid PRIMARY KEY, user_id uuid, client_id uuid, scopes text CHECK (char_length(scopes) <= 2048), granted_at timestamptz DEFAULT now(), revoked_at timestamptz );

-- Schema: realtime CREATE TABLE IF NOT EXISTS realtime.subscription ( id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, subscription_id uuid, entity regclass, filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[], claims jsonb, claims_role regrole DEFAULT realtime.to_regrole((claims ->> 'role'::text)), created_at timestamp DEFAULT timezone('utc'::text, now()) );

CREATE TABLE IF NOT EXISTS realtime.schema_migrations ( version bigint PRIMARY KEY, inserted_at timestamp );

CREATE TABLE IF NOT EXISTS realtime.messages ( topic text, extension text, payload jsonb, event text, private boolean DEFAULT false, updated_at timestamp DEFAULT now(), inserted_at timestamp DEFAULT now(), id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY );

-- END OF migration.sql
