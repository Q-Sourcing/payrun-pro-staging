


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'manager',
    'employee'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."benefit_type" AS ENUM (
    'health_insurance',
    'retirement',
    'dental',
    'vision',
    'other'
);


ALTER TYPE "public"."benefit_type" OWNER TO "postgres";


CREATE TYPE "public"."pay_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'monthly',
    'daily_rate'
);


ALTER TYPE "public"."pay_frequency" OWNER TO "postgres";


CREATE TYPE "public"."pay_frequency_old" AS ENUM (
    'weekly',
    'bi_weekly',
    'monthly',
    'custom',
    'Monthly'
);


ALTER TYPE "public"."pay_frequency_old" OWNER TO "postgres";


CREATE TYPE "public"."pay_group_type" AS ENUM (
    'local',
    'expatriate',
    'contractor',
    'intern',
    'temporary',
    'Expatriate',
    'Local'
);


ALTER TYPE "public"."pay_group_type" OWNER TO "postgres";


CREATE TYPE "public"."pay_item_status" AS ENUM (
    'draft',
    'pending',
    'approved',
    'paid'
);


ALTER TYPE "public"."pay_item_status" OWNER TO "postgres";


CREATE TYPE "public"."pay_run_status" AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'processed'
);


ALTER TYPE "public"."pay_run_status" OWNER TO "postgres";


CREATE TYPE "public"."pay_type" AS ENUM (
    'hourly',
    'salary',
    'piece_rate',
    'daily_rate'
);


ALTER TYPE "public"."pay_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_permissions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.permission_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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
$$;


ALTER FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") IS 'Mark super admin setup as complete';



CREATE OR REPLACE FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  org_mode boolean;
  duplicate_count int;
  emp_org_id uuid;
begin
  select e.organization_id into emp_org_id from employees e where e.id = new.employee_id;
  select use_strict_mode into org_mode from payroll_configurations where organization_id = emp_org_id limit 1;
  if org_mode is null then org_mode := true; end if; -- default strict
  if (new.active = false) then return new; end if;

  select count(*) into duplicate_count
  from paygroup_employees pe
  join employees e on e.id = pe.employee_id
  where pe.active = true
    and (
      (e.national_id is not null and e.national_id = (select national_id from employees where id = new.employee_id)) or
      (e.tin is not null and e.tin = (select tin from employees where id = new.employee_id)) or
      (e.social_security_number is not null and e.social_security_number = (select social_security_number from employees where id = new.employee_id))
    )
    and pe.employee_id != new.employee_id;

  if duplicate_count > 0 then
    if org_mode = true then
      raise exception 'Strict Mode: Employee with same identification already active in another paygroup.';
    else
      update paygroup_employees
      set active = false
      where employee_id in (
        select id from employees where
          (national_id = (select national_id from employees where id = new.employee_id) and national_id is not null) or
          (tin = (select tin from employees where id = new.employee_id) and tin is not null) or
          (social_security_number = (select social_security_number from employees where id = new.employee_id) and social_security_number is not null)
      )
      and id != new.id;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_unique_paygroup_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_mode boolean;
  duplicate_count int;
BEGIN
  -- Get organization mode (default to strict)
  SELECT use_strict_mode INTO org_mode 
  FROM payroll_configurations 
  WHERE organization_id = (SELECT organization_id FROM employees WHERE id = NEW.employee_id)
  LIMIT 1;
  
  IF org_mode IS NULL THEN 
    org_mode := true; -- default strict mode
  END IF;
  
  -- Skip validation for inactive assignments
  IF NEW.active = false THEN 
    RETURN NEW; 
  END IF;

  -- Check for duplicate active assignments based on identification
  SELECT COUNT(*) INTO duplicate_count
  FROM paygroup_employees pe
  JOIN employees e ON e.id = pe.employee_id
  WHERE pe.active = true
    AND pe.employee_id != NEW.employee_id
    AND (
      (e.national_id IS NOT NULL AND e.national_id = (SELECT national_id FROM employees WHERE id = NEW.employee_id)) OR
      (e.tin IS NOT NULL AND e.tin = (SELECT tin FROM employees WHERE id = NEW.employee_id)) OR
      (e.social_security_number IS NOT NULL AND e.social_security_number = (SELECT social_security_number FROM employees WHERE id = NEW.employee_id))
    );

  -- Handle based on mode
  IF duplicate_count > 0 THEN
    IF org_mode = true THEN
      RAISE EXCEPTION 'Strict Mode: Employee with same identification already active in another paygroup.';
    ELSE
      -- Smart mode: deactivate old assignments
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
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_unique_paygroup_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_raw_sql"("query" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result json;
BEGIN
  -- Execute the query and return results as JSON
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION
  WHEN others THEN
    -- Return error information safely
    RETURN json_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."exec_raw_sql"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  s record;
  prefix_parts text[] := ARRAY[]::text[];
  prefix text;
  digits integer;
  format text;
  seq integer;
  candidate text;
  dept_key text := coalesce(in_department, '');
  country_key text := coalesce(in_country, '');
  settings_id uuid;
BEGIN
  -- Load settings (singleton)
  SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
         use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
  INTO s
  FROM public.employee_number_settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF s IS NULL THEN
    -- create default settings row if missing
    INSERT INTO public.employee_number_settings (default_prefix) VALUES ('EMP') RETURNING id INTO settings_id;
    SELECT id, number_format, default_prefix, sequence_digits, use_department_prefix, include_country_code,
           use_employment_type, custom_prefix_per_pay_group, custom_format, next_sequence, department_rules, country_rules
    INTO s
    FROM public.employee_number_settings
    WHERE id = settings_id;
  END IF;

  digits := s.sequence_digits;
  format := s.number_format;

  -- Build prefix based on settings
  prefix_parts := ARRAY[]::text[];
  IF s.include_country_code AND country_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(country_key), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_employment_type AND coalesce(in_employee_type, '') <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(in_employee_type), '[^A-Z0-9]+', '-', 'g');
  END IF;

  IF s.use_department_prefix AND dept_key <> '' THEN
    prefix_parts := prefix_parts || regexp_replace(upper(dept_key), '[^A-Z0-9]+', '-', 'g');
  ELSE
    prefix_parts := prefix_parts || regexp_replace(upper(s.default_prefix), '[^A-Z0-9]+', '-', 'g');
  END IF;

  prefix := array_to_string(prefix_parts, '-');

  -- Determine sequence: support per-department start via department_rules
  IF s.department_rules ? dept_key THEN
    seq := (s.department_rules -> dept_key ->> 'next_sequence')::int;
    IF seq IS NULL OR seq < 1 THEN seq := 1; END IF;
    -- increment and save per-department sequence
    UPDATE public.employee_number_settings
    SET department_rules = jsonb_set(s.department_rules,
                                     ARRAY[dept_key, 'next_sequence'],
                                     to_jsonb(seq + 1), true),
        updated_at = now()
    WHERE id = s.id;
  ELSE
    seq := s.next_sequence;
    UPDATE public.employee_number_settings
    SET next_sequence = s.next_sequence + 1,
        updated_at = now()
    WHERE id = s.id;
  END IF;

  IF format = 'SEQUENCE' THEN
    candidate := lpad(seq::text, digits, '0');
  ELSE
    candidate := prefix || '-' || lpad(seq::text, digits, '0');
  END IF;

  -- Ensure uniqueness; loop if collision (rare but safe)
  WHILE EXISTS (SELECT 1 FROM public.employees e WHERE e.employee_number = candidate) LOOP
    seq := seq + 1;
    IF format = 'SEQUENCE' THEN
      candidate := lpad(seq::text, digits, '0');
    ELSE
      candidate := prefix || '-' || lpad(seq::text, digits, '0');
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;


ALTER FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_temp_password"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..16 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    RETURN password;
END;
$_$;


ALTER FUNCTION "public"."generate_temp_password"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_temp_password"() IS 'Generate a secure temporary password';



CREATE OR REPLACE FUNCTION "public"."get_super_admin_setup_status"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    super_admin_count INTEGER;
    setup_complete BOOLEAN;
    result JSON;
BEGIN
    -- Count super admins
    SELECT COUNT(*) INTO super_admin_count
    FROM public.users 
    WHERE role = 'super_admin' AND is_active = true;
    
    -- Check if setup is complete (super admin has logged in)
    SELECT COUNT(*) > 0 INTO setup_complete
    FROM public.users 
    WHERE role = 'super_admin' 
    AND is_active = true 
    AND last_login IS NOT NULL;
    
    result := json_build_object(
        'super_admin_count', super_admin_count,
        'setup_complete', setup_complete,
        'needs_initial_setup', super_admin_count > 0 AND NOT setup_complete
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_super_admin_setup_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_super_admin_setup_status"() IS 'Get the current status of super admin setup';



CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("user_id" "uuid", "permission_name" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    user_role := public.get_user_role(user_id);
    
    -- Super admin has all permissions
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- Check role-specific permissions
    CASE user_role
        WHEN 'organization_admin' THEN
            RETURN permission_name IN (
                'view_organization_employees',
                'edit_organization_employees',
                'process_payroll',
                'approve_payroll',
                'view_financial_reports',
                'manage_organization_users'
            );
        WHEN 'ceo_executive' THEN
            RETURN permission_name IN (
                'view_organization_employees',
                'view_financial_reports',
                'view_executive_reports',
                'approve_payroll'
            );
        WHEN 'payroll_manager' THEN
            RETURN permission_name IN (
                'view_department_employees',
                'edit_department_employees',
                'process_payroll',
                'view_department_reports',
                'approve_expenses',
                'approve_leave',
                'approve_overtime'
            );
        WHEN 'employee' THEN
            RETURN permission_name IN (
                'view_own_data',
                'edit_own_data',
                'view_own_reports'
            );
        WHEN 'hr_business_partner' THEN
            RETURN permission_name IN (
                'view_organization_employees',
                'edit_organization_employees',
                'view_department_reports',
                'approve_leave'
            );
        WHEN 'finance_controller' THEN
            RETURN permission_name IN (
                'view_organization_employees',
                'view_financial_reports',
                'view_executive_reports',
                'approve_payroll',
                'manage_budgets'
            );
        ELSE
            RETURN false;
    END CASE;
END;
$$;


ALTER FUNCTION "public"."has_permission"("user_id" "uuid", "permission_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_first_login"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT last_login IS NULL 
        FROM public.users 
        WHERE id = user_id
    );
END;
$$;


ALTER FUNCTION "public"."is_first_login"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_first_login"("user_id" "uuid") IS 'Check if this is the users first login';



CREATE OR REPLACE FUNCTION "public"."log_employee_number_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.employee_number IS DISTINCT FROM OLD.employee_number THEN
    INSERT INTO public.employee_number_history (employee_id, old_employee_number, new_employee_number, changed_by, reason)
    VALUES (NEW.id, OLD.employee_number, NEW.employee_number, NULL, 'Manual or system change');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_employee_number_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO database_health_log (
    health_score, health_status, critical_issues_count,
    total_checks, passed_checks, report_data
  ) VALUES (
    p_health_score, p_health_status, p_critical_issues_count,
    p_total_checks, p_passed_checks, p_report_data
  );
END;
$$;


ALTER FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- In a real implementation, this would send an email
    -- For now, we'll just log it
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
        (SELECT id FROM public.users WHERE email = user_email LIMIT 1),
        'setup_email_sent',
        'system',
        json_build_object('email', user_email, 'temp_password', temp_password),
        '127.0.0.1',
        'System',
        NOW(),
        'success'
    );
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") IS 'Send setup email to super admin';



CREATE OR REPLACE FUNCTION "public"."set_employee_number_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.employee_number IS NULL OR length(trim(NEW.employee_number)) = 0 THEN
    NEW.employee_number := public.generate_employee_number(NEW.department, NEW.country, NEW.employee_type, NEW.pay_group_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_employee_number_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF gross_pay < 100000 THEN RETURN 0; END IF;
  IF gross_pay < 200000 THEN RETURN 5000; END IF;
  IF gross_pay < 300000 THEN RETURN 10000; END IF;
  IF gross_pay < 400000 THEN RETURN 20000; END IF;
  IF gross_pay < 500000 THEN RETURN 30000; END IF;
  IF gross_pay < 600000 THEN RETURN 40000; END IF;
  IF gross_pay < 700000 THEN RETURN 60000; END IF;
  IF gross_pay < 800000 THEN RETURN 70000; END IF;
  IF gross_pay < 900000 THEN RETURN 80000; END IF;
  IF gross_pay < 1000000 THEN RETURN 90000; END IF;
  RETURN 100000;
END;
$$;


ALTER FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payslip_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payslip_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alert_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_id" "uuid",
    "rule_name" character varying(100) NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "message" "text" NOT NULL,
    "triggered_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alert_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_logs" IS 'Log of triggered alerts';



CREATE TABLE IF NOT EXISTS "public"."alert_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "condition" character varying(50) NOT NULL,
    "threshold" numeric(10,2) NOT NULL,
    "enabled" boolean DEFAULT true,
    "notification_channels" "text"[] DEFAULT '{}'::"text"[],
    "escalation_level" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alert_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."alert_rules" IS 'Rules for triggering alerts based on integration health';



CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "date" "date" NOT NULL,
    "check_in" time without time zone,
    "check_out" time without time zone,
    "total_hours" numeric(5,2) DEFAULT 0,
    "overtime_hours" numeric(5,2) DEFAULT 0,
    "status" character varying(20) NOT NULL,
    "leave_type" character varying(50),
    "remarks" "text",
    "synced_from_zoho" boolean DEFAULT false,
    "synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'half-day'::character varying, 'holiday'::character varying])::"text"[])))
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."attendance_records" IS 'Attendance records synced from Zoho People';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "action" character varying(100) NOT NULL,
    "user_id" character varying(100),
    "resource" character varying(100) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "timestamp" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "result" character varying(20),
    CONSTRAINT "audit_logs_result_check" CHECK ((("result")::"text" = ANY ((ARRAY['success'::character varying, 'failure'::character varying, 'denied'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for all user actions and system events';



CREATE TABLE IF NOT EXISTS "public"."benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cost" numeric(10,2) NOT NULL,
    "cost_type" "text" DEFAULT 'fixed'::"text" NOT NULL,
    "benefit_type" "public"."benefit_type" DEFAULT 'other'::"public"."benefit_type" NOT NULL,
    "applicable_countries" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "benefits_cost_type_check" CHECK (("cost_type" = ANY (ARRAY['fixed'::"text", 'percentage'::"text"])))
);


ALTER TABLE "public"."benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" DEFAULT 'SimplePay Solutions'::"text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "tax_id" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#3366CC'::"text",
    "secondary_color" "text" DEFAULT '#666666'::"text",
    "accent_color" "text" DEFAULT '#FF6B35'::"text",
    "include_logo" boolean DEFAULT true,
    "show_company_details" boolean DEFAULT true,
    "add_confidentiality_footer" boolean DEFAULT true,
    "include_generated_date" boolean DEFAULT true,
    "show_page_numbers" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."database_health_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_date" timestamp with time zone DEFAULT "now"(),
    "health_score" integer,
    "health_status" "text",
    "critical_issues_count" integer,
    "total_checks" integer,
    "passed_checks" integer,
    "report_data" "jsonb"
);


ALTER TABLE "public"."database_health_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_number_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "old_employee_number" "text",
    "new_employee_number" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "reason" "text"
);


ALTER TABLE "public"."employee_number_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_number_history" IS 'Audit trail for employee number changes';



CREATE TABLE IF NOT EXISTS "public"."employee_number_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number_format" "text" DEFAULT 'PREFIX-SEQUENCE'::"text" NOT NULL,
    "default_prefix" "text" DEFAULT 'EMP'::"text" NOT NULL,
    "sequence_digits" integer DEFAULT 3 NOT NULL,
    "use_department_prefix" boolean DEFAULT false NOT NULL,
    "include_country_code" boolean DEFAULT false NOT NULL,
    "use_employment_type" boolean DEFAULT false NOT NULL,
    "custom_prefix_per_pay_group" boolean DEFAULT false NOT NULL,
    "custom_format" "text",
    "next_sequence" integer DEFAULT 1 NOT NULL,
    "department_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "country_rules" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_number_settings_next_sequence_check" CHECK (("next_sequence" > 0)),
    CONSTRAINT "employee_number_settings_sequence_digits_check" CHECK ((("sequence_digits" >= 1) AND ("sequence_digits" <= 10)))
);


ALTER TABLE "public"."employee_number_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."employee_number_settings" IS 'Company-wide employee numbering configuration';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "pay_type" "public"."pay_type" DEFAULT 'hourly'::"public"."pay_type" NOT NULL,
    "pay_rate" numeric(10,2) NOT NULL,
    "country" "text" NOT NULL,
    "pay_group_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text" NOT NULL,
    "middle_name" "text",
    "last_name" "text",
    "currency" "text",
    "employee_type" "text" DEFAULT 'local'::"text" NOT NULL,
    "gender" "text",
    "date_of_birth" "date",
    "national_id" "text",
    "tin" "text",
    "nssf_number" "text",
    "passport_number" "text",
    "bank_name" "text",
    "bank_branch" "text",
    "account_number" "text",
    "account_type" "text",
    "department" "text",
    "project" "text",
    "employee_number" "text" NOT NULL,
    "social_security_number" "text",
    "employee_category" "text",
    "employment_status" "text" DEFAULT 'Active'::"text",
    CONSTRAINT "check_employees_category" CHECK ((("employee_category" IS NULL) OR ("employee_category" = ANY (ARRAY['Intern'::"text", 'Trainee'::"text", 'Temporary'::"text", 'Permanent'::"text", 'On Contract'::"text", 'Casual'::"text"])))),
    CONSTRAINT "check_employees_status" CHECK (("employment_status" = ANY (ARRAY['Active'::"text", 'Terminated'::"text", 'Deceased'::"text", 'Resigned'::"text", 'Probation'::"text", 'Notice Period'::"text"]))),
    CONSTRAINT "employee_type_check" CHECK (("employee_type" = ANY (ARRAY['local'::"text", 'expatriate'::"text"]))),
    CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."employee_type" IS 'Employee type: Local or Expatriate';



COMMENT ON COLUMN "public"."employees"."gender" IS 'Employee gender: Male, Female, or Other';



COMMENT ON COLUMN "public"."employees"."date_of_birth" IS 'Employee date of birth';



COMMENT ON COLUMN "public"."employees"."national_id" IS 'National ID or identification number';



COMMENT ON COLUMN "public"."employees"."tin" IS 'Tax Identification Number';



COMMENT ON COLUMN "public"."employees"."nssf_number" IS 'Social Security/NSSF number';



COMMENT ON COLUMN "public"."employees"."passport_number" IS 'Passport number for international employees';



COMMENT ON COLUMN "public"."employees"."bank_name" IS 'Employee bank name for salary payments';



COMMENT ON COLUMN "public"."employees"."bank_branch" IS 'Bank branch for salary payments';



COMMENT ON COLUMN "public"."employees"."account_number" IS 'Bank account number for salary payments';



COMMENT ON COLUMN "public"."employees"."account_type" IS 'Bank account type (Savings, Current, Salary Account)';



COMMENT ON COLUMN "public"."employees"."department" IS 'Employee department or project assignment';



COMMENT ON COLUMN "public"."employees"."employee_number" IS 'System-wide unique employee identifier (e.g., EMP-001)';



COMMENT ON COLUMN "public"."employees"."employee_category" IS 'Employee category: Intern, Trainee, Temporary, Permanent, On Contract, Casual';



COMMENT ON COLUMN "public"."employees"."employment_status" IS 'Employment status: Active, Terminated, Deceased, Resigned, Probation, Notice Period';



CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paygroup_id" "text",
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "exchange_rate_to_local" numeric(12,4) DEFAULT 0 NOT NULL,
    "tax_country" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expatriate_pay_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid",
    "employee_id" "uuid",
    "expatriate_pay_group_id" "uuid",
    "daily_rate" numeric(12,2) NOT NULL,
    "days_worked" integer NOT NULL,
    "allowances_foreign" numeric(12,2) DEFAULT 0,
    "net_foreign" numeric(12,2) NOT NULL,
    "net_local" numeric(12,2) NOT NULL,
    "gross_local" numeric(12,2) NOT NULL,
    "tax_country" "text" NOT NULL,
    "exchange_rate_to_local" numeric(12,4) NOT NULL,
    "currency" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expatriate_pay_run_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expatriate_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" NOT NULL,
    "flat_tax_rate" numeric,
    "apply_flat_tax" boolean DEFAULT false NOT NULL,
    "social_security_treatment" "text" DEFAULT 'full'::"text" NOT NULL,
    "social_security_reduced_rate" numeric,
    "exempt_lst" boolean DEFAULT false NOT NULL,
    "exempt_nhif" boolean DEFAULT false NOT NULL,
    "exempt_housing_levy" boolean DEFAULT false NOT NULL,
    "housing_allowance_percent" numeric DEFAULT 0,
    "education_allowance_percent" numeric DEFAULT 0,
    "travel_allowance_percent" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expatriate_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "last_sync" timestamp with time zone,
    "uptime" numeric(5,2) DEFAULT 0,
    "api_response_time" integer DEFAULT 0,
    "error_rate" numeric(5,2) DEFAULT 0,
    "total_syncs" integer DEFAULT 0,
    "successful_syncs" integer DEFAULT 0,
    "failed_syncs" integer DEFAULT 0,
    "checked_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "integration_health_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['healthy'::character varying, 'warning'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."integration_health" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_health" IS 'Health monitoring data for integrations';



CREATE TABLE IF NOT EXISTS "public"."integration_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "token_type" character varying(20) DEFAULT 'Bearer'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_tokens" IS 'Stores OAuth tokens for external integrations';



CREATE TABLE IF NOT EXISTS "public"."lst_employee_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "annual_amount" numeric NOT NULL,
    "months" integer NOT NULL,
    "start_month" "date" NOT NULL,
    "distribution" "text" NOT NULL,
    "custom_amounts" "jsonb",
    "percentages" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lst_employee_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."lst_employee_assignments" IS 'LST plan assignments per employee';



CREATE TABLE IF NOT EXISTS "public"."lst_payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" DEFAULT 'Uganda'::"text" NOT NULL,
    "method" "text" DEFAULT 'official_brackets'::"text" NOT NULL,
    "annual_amount" numeric DEFAULT 0 NOT NULL,
    "months" integer DEFAULT 3 NOT NULL,
    "distribution" "text" DEFAULT 'equal'::"text" NOT NULL,
    "custom_amounts" "jsonb",
    "percentages" "jsonb",
    "start_month" "date" NOT NULL,
    "apply_future" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lst_payment_plans_months_check" CHECK ((("months" >= 1) AND ("months" <= 24)))
);


ALTER TABLE "public"."lst_payment_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."lst_payment_plans" IS 'LST payment plan templates for batches';



CREATE TABLE IF NOT EXISTS "public"."notification_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_channels_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'webhook'::character varying, 'slack'::character varying])::"text"[])))
);


ALTER TABLE "public"."notification_channels" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_channels" IS 'Channels for sending alerts and notifications';



CREATE TABLE IF NOT EXISTS "public"."pay_calculation_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "pay_run_id" "uuid",
    "input_data" "jsonb" NOT NULL,
    "output_data" "jsonb" NOT NULL,
    "calculation_type" "text" DEFAULT 'payroll_calculation'::"text",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pay_calculation_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."pay_calculation_audit_log" IS 'Audit log for payroll calculations performed by Edge Functions';



CREATE TABLE IF NOT EXISTS "public"."pay_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "pay_frequency" "public"."pay_frequency" DEFAULT 'monthly'::"public"."pay_frequency" NOT NULL,
    "default_tax_percentage" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."pay_group_type" DEFAULT 'local'::"public"."pay_group_type" NOT NULL
);


ALTER TABLE "public"."pay_groups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pay_groups"."type" IS 'Pay group type: local, expatriate, contractor, intern, temporary';



CREATE TABLE IF NOT EXISTS "public"."pay_item_custom_deductions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'deduction'::"text" NOT NULL,
    CONSTRAINT "pay_item_custom_deductions_type_check" CHECK (("type" = ANY (ARRAY['deduction'::"text", 'benefit'::"text", 'allowance'::"text"])))
);


ALTER TABLE "public"."pay_item_custom_deductions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "hours_worked" numeric(8,2),
    "pieces_completed" integer,
    "gross_pay" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "benefit_deductions" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_deductions" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."pay_item_status" DEFAULT 'draft'::"public"."pay_item_status" NOT NULL,
    "employer_contributions" numeric DEFAULT 0.00 NOT NULL
);


ALTER TABLE "public"."pay_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pay_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "pay_period_start" "date" NOT NULL,
    "pay_period_end" "date" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "status" "public"."pay_run_status" DEFAULT 'draft'::"public"."pay_run_status" NOT NULL,
    "total_gross_pay" numeric(12,2) DEFAULT 0.00,
    "total_deductions" numeric(12,2) DEFAULT 0.00,
    "total_net_pay" numeric(12,2) DEFAULT 0.00,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pay_run_id" character varying(50)
);


ALTER TABLE "public"."pay_runs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pay_runs"."pay_run_id" IS 'Unique identifier for pay run in format [Prefix]-[YYYYMMDD]-[HHMMSS]';



CREATE TABLE IF NOT EXISTS "public"."paygroup_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "notes" "text"
);


ALTER TABLE "public"."paygroup_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "use_strict_mode" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payroll_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payrun_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payrun_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslip_generations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "pay_run_id" "uuid",
    "employee_id" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "export_format" "text" DEFAULT 'pdf'::"text" NOT NULL,
    "file_size" integer,
    "created_by" "uuid"
);


ALTER TABLE "public"."payslip_generations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payslip_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "config" "jsonb" NOT NULL,
    "user_id" "uuid",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payslip_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource" character varying(100) NOT NULL,
    "permission" character varying(100) NOT NULL,
    "has_permission" boolean NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."permission_cache" IS 'Cached permission check results for performance';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(50) NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_assignments_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying])::"text"[])))
);


ALTER TABLE "public"."role_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_assignments" IS 'History of role assignments and changes';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "category" "text" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Active user sessions for security management';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "role" character varying(50) NOT NULL,
    "organization_id" "uuid",
    "department_id" character varying(100),
    "manager_id" "uuid",
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "two_factor_enabled" boolean DEFAULT false,
    "session_timeout" integer DEFAULT 480,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "restrictions" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying, 'ceo_executive'::character varying, 'payroll_manager'::character varying, 'employee'::character varying, 'hr_business_partner'::character varying, 'finance_controller'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User accounts with role-based access control';



CREATE OR REPLACE VIEW "public"."super_admin_dashboard" AS
 SELECT "u"."id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."role",
    "u"."is_active",
    "u"."two_factor_enabled",
    "u"."last_login",
    "u"."created_at",
    "count"(DISTINCT "s"."id") AS "active_sessions",
    "count"(DISTINCT "al"."id") AS "recent_activity_count"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."user_sessions" "s" ON ((("u"."id" = "s"."user_id") AND ("s"."is_active" = true))))
     LEFT JOIN "public"."audit_logs" "al" ON (((("u"."id")::"text" = ("al"."user_id")::"text") AND ("al"."timestamp" >= ("now"() - '24:00:00'::interval)))))
  WHERE (("u"."role")::"text" = 'super_admin'::"text")
  GROUP BY "u"."id", "u"."email", "u"."first_name", "u"."last_name", "u"."role", "u"."is_active", "u"."two_factor_enabled", "u"."last_login", "u"."created_at";


ALTER VIEW "public"."super_admin_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_name" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "enabled" boolean DEFAULT true,
    "frequency" character varying(20) NOT NULL,
    "direction" character varying(20) NOT NULL,
    "data_mapping" "jsonb" DEFAULT '[]'::"jsonb",
    "filters" "jsonb" DEFAULT '{}'::"jsonb",
    "retry_attempts" integer DEFAULT 3,
    "timeout" integer DEFAULT 30000,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_configurations_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying, 'bidirectional'::character varying])::"text"[]))),
    CONSTRAINT "sync_configurations_frequency_check" CHECK ((("frequency")::"text" = ANY ((ARRAY['realtime'::character varying, 'hourly'::character varying, 'daily'::character varying, 'weekly'::character varying])::"text"[])))
);


ALTER TABLE "public"."sync_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_configurations" IS 'Configuration for data synchronization between systems';



CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_id" character varying(100) NOT NULL,
    "type" character varying(50) NOT NULL,
    "direction" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "records_processed" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."sync_logs" IS 'Logs of synchronization operations';



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "dashboard_config" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'User-specific preferences and dashboard configuration';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alert_logs"
    ADD CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_rules"
    ADD CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benefits"
    ADD CONSTRAINT "benefits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."database_health_log"
    ADD CONSTRAINT "database_health_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_number_history"
    ADD CONSTRAINT "employee_number_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_number_settings"
    ADD CONSTRAINT "employee_number_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_pay_groups"
    ADD CONSTRAINT "expatriate_pay_groups_paygroup_id_key" UNIQUE ("paygroup_id");



ALTER TABLE ONLY "public"."expatriate_pay_groups"
    ADD CONSTRAINT "expatriate_pay_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expatriate_policies"
    ADD CONSTRAINT "expatriate_policies_country_key" UNIQUE ("country");



ALTER TABLE ONLY "public"."expatriate_policies"
    ADD CONSTRAINT "expatriate_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_health"
    ADD CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_tokens"
    ADD CONSTRAINT "integration_tokens_integration_name_key" UNIQUE ("integration_name");



ALTER TABLE ONLY "public"."integration_tokens"
    ADD CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_plan_id_employee_id_key" UNIQUE ("plan_id", "employee_id");



ALTER TABLE ONLY "public"."lst_payment_plans"
    ADD CONSTRAINT "lst_payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_channels"
    ADD CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_groups"
    ADD CONSTRAINT "pay_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_item_custom_deductions"
    ADD CONSTRAINT "pay_item_custom_deductions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pay_run_id_key" UNIQUE ("pay_run_id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_configurations"
    ADD CONSTRAINT "payroll_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_run_id_employee_id_key" UNIQUE ("pay_run_id", "employee_id");



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payslip_templates"
    ADD CONSTRAINT "payslip_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_cache"
    ADD CONSTRAINT "permission_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_category_key_key" UNIQUE ("user_id", "category", "key");



ALTER TABLE ONLY "public"."sync_configurations"
    ADD CONSTRAINT "sync_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alert_logs_rule_id" ON "public"."alert_logs" USING "btree" ("rule_id");



CREATE INDEX "idx_alert_logs_triggered_at" ON "public"."alert_logs" USING "btree" ("triggered_at");



CREATE INDEX "idx_attendance_records_employee_date" ON "public"."attendance_records" USING "btree" ("employee_id", "date");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_action_timestamp" ON "public"."audit_logs" USING "btree" ("action", "timestamp");



CREATE INDEX "idx_audit_logs_integration_action" ON "public"."audit_logs" USING "btree" ("integration_name", "action");



CREATE INDEX "idx_audit_logs_resource" ON "public"."audit_logs" USING "btree" ("resource");



CREATE INDEX "idx_audit_logs_result" ON "public"."audit_logs" USING "btree" ("result");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_custom_deductions_pay_item_id" ON "public"."pay_item_custom_deductions" USING "btree" ("pay_item_id");



CREATE INDEX "idx_employees_department" ON "public"."employees" USING "btree" ("department");



CREATE INDEX "idx_employees_employee_category" ON "public"."employees" USING "btree" ("employee_category");



CREATE INDEX "idx_employees_employee_type" ON "public"."employees" USING "btree" ("employee_type");



CREATE INDEX "idx_employees_employment_status" ON "public"."employees" USING "btree" ("employment_status");



CREATE INDEX "idx_employees_national_id" ON "public"."employees" USING "btree" ("national_id");



CREATE INDEX "idx_employees_nssf_number" ON "public"."employees" USING "btree" ("nssf_number");



CREATE INDEX "idx_employees_ssn" ON "public"."employees" USING "btree" ("social_security_number");



CREATE INDEX "idx_employees_tin" ON "public"."employees" USING "btree" ("tin");



CREATE INDEX "idx_expatriate_pay_groups_country" ON "public"."expatriate_pay_groups" USING "btree" ("country");



CREATE INDEX "idx_expatriate_pay_groups_currency" ON "public"."expatriate_pay_groups" USING "btree" ("currency");



CREATE INDEX "idx_expatriate_pay_groups_tax_country" ON "public"."expatriate_pay_groups" USING "btree" ("tax_country");



CREATE INDEX "idx_expatriate_pay_run_items_employee_id" ON "public"."expatriate_pay_run_items" USING "btree" ("employee_id");



CREATE INDEX "idx_expatriate_pay_run_items_expatriate_pay_group_id" ON "public"."expatriate_pay_run_items" USING "btree" ("expatriate_pay_group_id");



CREATE INDEX "idx_expatriate_pay_run_items_pay_run_id" ON "public"."expatriate_pay_run_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_health_log_date" ON "public"."database_health_log" USING "btree" ("check_date" DESC);



CREATE INDEX "idx_integration_health_name_checked" ON "public"."integration_health" USING "btree" ("integration_name", "checked_at");



CREATE INDEX "idx_integration_tokens_name" ON "public"."integration_tokens" USING "btree" ("integration_name");



CREATE INDEX "idx_pay_calculation_audit_calculated_at" ON "public"."pay_calculation_audit_log" USING "btree" ("calculated_at");



CREATE INDEX "idx_pay_calculation_audit_employee_id" ON "public"."pay_calculation_audit_log" USING "btree" ("employee_id");



CREATE INDEX "idx_pay_calculation_audit_pay_run_id" ON "public"."pay_calculation_audit_log" USING "btree" ("pay_run_id");



CREATE INDEX "idx_pay_groups_type" ON "public"."pay_groups" USING "btree" ("type");



CREATE INDEX "idx_pay_items_employee_id" ON "public"."pay_items" USING "btree" ("employee_id");



CREATE INDEX "idx_pay_items_pay_run_id" ON "public"."pay_items" USING "btree" ("pay_run_id");



CREATE INDEX "idx_pay_items_status" ON "public"."pay_items" USING "btree" ("status");



CREATE INDEX "idx_pay_runs_pay_run_id" ON "public"."pay_runs" USING "btree" ("pay_run_id");



CREATE INDEX "idx_payrun_employees_employee_id" ON "public"."payrun_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_payrun_employees_pay_group_id" ON "public"."payrun_employees" USING "btree" ("pay_group_id");



CREATE INDEX "idx_payrun_employees_pay_run_id" ON "public"."payrun_employees" USING "btree" ("pay_run_id");



CREATE INDEX "idx_payslip_generations_employee_id" ON "public"."payslip_generations" USING "btree" ("employee_id");



CREATE INDEX "idx_payslip_generations_pay_run_id" ON "public"."payslip_generations" USING "btree" ("pay_run_id");



CREATE INDEX "idx_payslip_generations_template_id" ON "public"."payslip_generations" USING "btree" ("template_id");



CREATE INDEX "idx_payslip_templates_is_default" ON "public"."payslip_templates" USING "btree" ("user_id", "is_default");



CREATE INDEX "idx_payslip_templates_user_id" ON "public"."payslip_templates" USING "btree" ("user_id");



CREATE INDEX "idx_permission_cache_expires" ON "public"."permission_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_permission_cache_resource" ON "public"."permission_cache" USING "btree" ("resource");



CREATE INDEX "idx_permission_cache_user" ON "public"."permission_cache" USING "btree" ("user_id");



CREATE INDEX "idx_pge_active" ON "public"."paygroup_employees" USING "btree" ("active");



CREATE INDEX "idx_pge_employee" ON "public"."paygroup_employees" USING "btree" ("employee_id");



CREATE INDEX "idx_pge_group" ON "public"."paygroup_employees" USING "btree" ("pay_group_id");



CREATE INDEX "idx_role_assignments_active" ON "public"."role_assignments" USING "btree" ("is_active");



CREATE INDEX "idx_role_assignments_assigned_at" ON "public"."role_assignments" USING "btree" ("assigned_at");



CREATE INDEX "idx_role_assignments_role" ON "public"."role_assignments" USING "btree" ("role");



CREATE INDEX "idx_role_assignments_user" ON "public"."role_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_sync_logs_started_at" ON "public"."sync_logs" USING "btree" ("started_at");



CREATE INDEX "idx_sync_logs_sync_id" ON "public"."sync_logs" USING "btree" ("sync_id");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_user_sessions_expires" ON "public"."user_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_user_sessions_token" ON "public"."user_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_user_sessions_user" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_department" ON "public"."users" USING "btree" ("department_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_login" ON "public"."users" USING "btree" ("last_login");



CREATE INDEX "idx_users_manager" ON "public"."users" USING "btree" ("manager_id");



CREATE INDEX "idx_users_organization" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_role_active" ON "public"."users" USING "btree" ("role", "is_active");



CREATE UNIQUE INDEX "uq_employee_number_settings_singleton" ON "public"."employee_number_settings" USING "btree" ((true));



CREATE UNIQUE INDEX "uq_employees_employee_number" ON "public"."employees" USING "btree" ("employee_number");



CREATE OR REPLACE TRIGGER "trg_enforce_unique_or_smart" BEFORE INSERT OR UPDATE ON "public"."paygroup_employees" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"();



CREATE OR REPLACE TRIGGER "trg_enforce_unique_paygroup" BEFORE INSERT OR UPDATE ON "public"."paygroup_employees" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_unique_paygroup_assignment"();



CREATE OR REPLACE TRIGGER "trg_log_employee_number_change" AFTER UPDATE OF "employee_number" ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."log_employee_number_change"();



CREATE OR REPLACE TRIGGER "trg_set_employee_number_before_insert" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_employee_number_before_insert"();



CREATE OR REPLACE TRIGGER "update_benefits_updated_at" BEFORE UPDATE ON "public"."benefits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_settings_updated_at" BEFORE UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_number_settings_updated_at" BEFORE UPDATE ON "public"."employee_number_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expatriate_policies_updated_at" BEFORE UPDATE ON "public"."expatriate_policies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_groups_updated_at" BEFORE UPDATE ON "public"."pay_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_items_updated_at" BEFORE UPDATE ON "public"."pay_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pay_runs_updated_at" BEFORE UPDATE ON "public"."pay_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payslip_templates_updated_at" BEFORE UPDATE ON "public"."payslip_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_payslip_templates_updated_at"();



CREATE OR REPLACE TRIGGER "update_settings_updated_at" BEFORE UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alert_logs"
    ADD CONSTRAINT "alert_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_number_history"
    ADD CONSTRAINT "employee_number_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_expatriate_pay_group_id_fkey" FOREIGN KEY ("expatriate_pay_group_id") REFERENCES "public"."expatriate_pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expatriate_pay_run_items"
    ADD CONSTRAINT "expatriate_pay_run_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lst_employee_assignments"
    ADD CONSTRAINT "lst_employee_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."lst_payment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."pay_calculation_audit_log"
    ADD CONSTRAINT "pay_calculation_audit_log_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id");



ALTER TABLE ONLY "public"."pay_item_custom_deductions"
    ADD CONSTRAINT "pay_item_custom_deductions_pay_item_id_fkey" FOREIGN KEY ("pay_item_id") REFERENCES "public"."pay_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."pay_items"
    ADD CONSTRAINT "pay_items_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pay_runs"
    ADD CONSTRAINT "pay_runs_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paygroup_employees"
    ADD CONSTRAINT "paygroup_employees_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_group_id_fkey" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrun_employees"
    ADD CONSTRAINT "payrun_employees_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_pay_run_id_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "public"."pay_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_generations"
    ADD CONSTRAINT "payslip_generations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."payslip_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payslip_templates"
    ADD CONSTRAINT "payslip_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_cache"
    ADD CONSTRAINT "permission_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments"
    ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."pay_groups"("id") ON DELETE SET NULL;



CREATE POLICY "Admin access to alert logs" ON "public"."alert_logs" USING (true);



CREATE POLICY "Admin access to alert rules" ON "public"."alert_rules" USING (true);



CREATE POLICY "Admin access to attendance records" ON "public"."attendance_records" USING (true);



CREATE POLICY "Admin access to audit logs" ON "public"."audit_logs" USING (true);



CREATE POLICY "Admin access to integration data" ON "public"."integration_tokens" USING (true);



CREATE POLICY "Admin access to integration health" ON "public"."integration_health" USING (true);



CREATE POLICY "Admin access to notification channels" ON "public"."notification_channels" USING (true);



CREATE POLICY "Admin access to sync configurations" ON "public"."sync_configurations" USING (true);



CREATE POLICY "Admin access to sync logs" ON "public"."sync_logs" USING (true);



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view all role assignments" ON "public"."role_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view all sessions" ON "public"."user_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['super_admin'::character varying, 'organization_admin'::character varying])::"text"[]))))));



CREATE POLICY "Allow all access to benefits" ON "public"."benefits" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to company settings" ON "public"."company_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to employee_number_settings" ON "public"."employee_number_settings" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to employees" ON "public"."employees" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to expatriate policies" ON "public"."expatriate_policies" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay groups" ON "public"."pay_groups" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay items" ON "public"."pay_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay runs" ON "public"."pay_runs" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to pay_item_custom_deductions" ON "public"."pay_item_custom_deductions" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to manage paygroup employees" ON "public"."paygroup_employees" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to manage payroll configs" ON "public"."payroll_configurations" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to view paygroup employees" ON "public"."paygroup_employees" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to view payroll configs" ON "public"."payroll_configurations" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view audit logs" ON "public"."pay_calculation_audit_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Department managers can view department users" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u1",
    "public"."users" "u2"
  WHERE (("u1"."id" = "auth"."uid"()) AND (("u1"."role")::"text" = 'payroll_manager'::"text") AND ("u2"."id" = "users"."id") AND (("u1"."department_id")::"text" = ("u2"."department_id")::"text")))));



CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_groups" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."expatriate_pay_run_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_groups" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."expatriate_pay_run_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_groups" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."expatriate_pay_run_items" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_groups" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."expatriate_pay_run_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Organization admins can view organization users" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u1",
    "public"."users" "u2"
  WHERE (("u1"."id" = "auth"."uid"()) AND (("u1"."role")::"text" = 'organization_admin'::"text") AND ("u2"."id" = "users"."id") AND ("u1"."organization_id" = "u2"."organization_id")))));



CREATE POLICY "Service role can insert audit logs" ON "public"."pay_calculation_audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Super admins can manage all roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can view all roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can view all users" ON "public"."users" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND (("users_1"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "System can manage permission cache" ON "public"."permission_cache" USING (true);



CREATE POLICY "Users can delete their own payslip templates" ON "public"."payslip_templates" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own settings" ON "public"."settings" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert payslip generations" ON "public"."payslip_generations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own payslip templates" ON "public"."payslip_templates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own settings" ON "public"."settings" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own payslip templates" ON "public"."payslip_templates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own settings" ON "public"."settings" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payslip generations for their templates" ON "public"."payslip_generations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."payslip_templates"
  WHERE (("payslip_templates"."id" = "payslip_generations"."template_id") AND ("payslip_templates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own payslip templates" ON "public"."payslip_templates" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own permission cache" ON "public"."permission_cache" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own role assignments" ON "public"."role_assignments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own settings" ON "public"."settings" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



ALTER TABLE "public"."alert_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."benefits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete paygroup_employees" ON "public"."paygroup_employees" FOR DELETE USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."employee_number_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_number_history_all" ON "public"."employee_number_history" USING (true) WITH CHECK (true);



ALTER TABLE "public"."employee_number_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_number_settings_all" ON "public"."employee_number_settings" USING (true) WITH CHECK (true);



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_pay_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_pay_run_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expatriate_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert paygroup_employees" ON "public"."paygroup_employees" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."integration_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_calculation_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_item_custom_deductions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pay_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paygroup_employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payslip_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payslip_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update paygroup_employees" ON "public"."paygroup_employees" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view paygroup_employees" ON "public"."paygroup_employees" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = ANY (ARRAY['super_admin'::"public"."app_role", 'admin'::"public"."app_role", 'manager'::"public"."app_role"])))) OR ("assigned_by" = "auth"."uid"())));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_super_admin_setup"("user_id" "uuid", "security_questions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_unique_or_smart_paygroup_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_unique_paygroup_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_raw_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_raw_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_raw_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_employee_number"("in_department" "text", "in_country" "text", "in_employee_type" "text", "in_pay_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_temp_password"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_super_admin_setup_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "permission_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "permission_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "permission_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_first_login"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_employee_number_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_health_check"("p_health_score" integer, "p_health_status" "text", "p_critical_issues_count" integer, "p_total_checks" integer, "p_passed_checks" integer, "p_report_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_super_admin_setup_email"("user_email" "text", "temp_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_employee_number_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ug_lst_annual_amount"("gross_pay" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payslip_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."alert_logs" TO "anon";
GRANT ALL ON TABLE "public"."alert_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_logs" TO "service_role";



GRANT ALL ON TABLE "public"."alert_rules" TO "anon";
GRANT ALL ON TABLE "public"."alert_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_rules" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."benefits" TO "anon";
GRANT ALL ON TABLE "public"."benefits" TO "authenticated";
GRANT ALL ON TABLE "public"."benefits" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."database_health_log" TO "anon";
GRANT ALL ON TABLE "public"."database_health_log" TO "authenticated";
GRANT ALL ON TABLE "public"."database_health_log" TO "service_role";



GRANT ALL ON TABLE "public"."employee_number_history" TO "anon";
GRANT ALL ON TABLE "public"."employee_number_history" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_number_history" TO "service_role";



GRANT ALL ON TABLE "public"."employee_number_settings" TO "anon";
GRANT ALL ON TABLE "public"."employee_number_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_number_settings" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_pay_groups" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_pay_run_items" TO "service_role";



GRANT ALL ON TABLE "public"."expatriate_policies" TO "anon";
GRANT ALL ON TABLE "public"."expatriate_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."expatriate_policies" TO "service_role";



GRANT ALL ON TABLE "public"."integration_health" TO "anon";
GRANT ALL ON TABLE "public"."integration_health" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_health" TO "service_role";



GRANT ALL ON TABLE "public"."integration_tokens" TO "anon";
GRANT ALL ON TABLE "public"."integration_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "anon";
GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."lst_employee_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."lst_payment_plans" TO "anon";
GRANT ALL ON TABLE "public"."lst_payment_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."lst_payment_plans" TO "service_role";



GRANT ALL ON TABLE "public"."notification_channels" TO "anon";
GRANT ALL ON TABLE "public"."notification_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_channels" TO "service_role";



GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_calculation_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."pay_groups" TO "anon";
GRANT ALL ON TABLE "public"."pay_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_groups" TO "service_role";



GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "anon";
GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_item_custom_deductions" TO "service_role";



GRANT ALL ON TABLE "public"."pay_items" TO "anon";
GRANT ALL ON TABLE "public"."pay_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_items" TO "service_role";



GRANT ALL ON TABLE "public"."pay_runs" TO "anon";
GRANT ALL ON TABLE "public"."pay_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pay_runs" TO "service_role";



GRANT ALL ON TABLE "public"."paygroup_employees" TO "anon";
GRANT ALL ON TABLE "public"."paygroup_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."paygroup_employees" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_configurations" TO "anon";
GRANT ALL ON TABLE "public"."payroll_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."payrun_employees" TO "anon";
GRANT ALL ON TABLE "public"."payrun_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."payrun_employees" TO "service_role";



GRANT ALL ON TABLE "public"."payslip_generations" TO "anon";
GRANT ALL ON TABLE "public"."payslip_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."payslip_generations" TO "service_role";



GRANT ALL ON TABLE "public"."payslip_templates" TO "anon";
GRANT ALL ON TABLE "public"."payslip_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."payslip_templates" TO "service_role";



GRANT ALL ON TABLE "public"."permission_cache" TO "anon";
GRANT ALL ON TABLE "public"."permission_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_cache" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."super_admin_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."sync_configurations" TO "anon";
GRANT ALL ON TABLE "public"."sync_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
