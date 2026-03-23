-- Baseline for tables created directly on remote DB without migration files
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS throughout

-- Missing enum types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'head_office_pay_group_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.head_office_pay_group_type AS ENUM ('regular', 'intern', 'expatriate');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'head_office_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.head_office_status AS ENUM ('draft', 'active', 'locked');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_admin_role' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.platform_admin_role AS ENUM ('super_admin', 'support_admin', 'compliance', 'billing');
    END IF;
END $$;

-- access_grants
CREATE TABLE IF NOT EXISTS "public"."access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "user_id" "uuid",
    "role_id" "uuid",
    "scope_type" "text" NOT NULL,
    "scope_key" "text" NOT NULL,
    "effect" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "access_grants_effect_check" CHECK (("effect" = ANY (ARRAY['allow'::"text", 'deny'::"text"]))),
    CONSTRAINT "access_grants_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['org'::"text", 'company'::"text", 'module'::"text", 'project_type'::"text", 'action'::"text"])))
);

-- activity_logs
CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- approval_workflow_steps
CREATE TABLE IF NOT EXISTS "public"."approval_workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "approver_user_id" "uuid",
    "approver_role" "text",
    "sequence_number" integer NOT NULL,
    "notify_email" boolean DEFAULT true,
    "notify_in_app" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "approver_type" "text" DEFAULT 'role'::"text",
    "fallback_user_id" "uuid",
    CONSTRAINT "approval_workflow_steps_approver_type_check" CHECK (("approver_type" = ANY (ARRAY['role'::"text", 'individual'::"text", 'hybrid'::"text"]))),
    CONSTRAINT "approval_workflow_steps_level_check" CHECK (("level" >= 1))
);

-- approval_workflows
CREATE TABLE IF NOT EXISTS "public"."approval_workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "applies_to_scopes" "jsonb" DEFAULT '[]'::"jsonb",
    "version" integer DEFAULT 1
);

-- auth_events
CREATE TABLE IF NOT EXISTS "public"."auth_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "timestamp_utc" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "geo_location" "jsonb",
    "user_agent" "text",
    "success" boolean NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);

-- banks
CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "name" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "swift_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    UNIQUE (name, country_code)
);

-- cleanup_logs
CREATE TABLE IF NOT EXISTS "public"."cleanup_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text" DEFAULT 'invite_cleanup'::"text" NOT NULL,
    "action" "text" NOT NULL,
    "email" "text",
    "auth_user_id" "uuid",
    "invite_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

-- companies
CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "country_id" "uuid",
    "currency" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "short_code" "text"
);

-- company_unit_categories
CREATE TABLE IF NOT EXISTS "public"."company_unit_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "company_unit_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);

-- company_units
CREATE TABLE IF NOT EXISTS "public"."company_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "active" boolean DEFAULT true,
    "category_id" "uuid",
    CONSTRAINT "company_units_kind_check" CHECK ((("kind" IS NULL) OR ("kind" = ANY (ARRAY['head_office'::"text", 'project'::"text"])))),
    CONSTRAINT "org_units_kind_check" CHECK (("kind" = ANY (ARRAY['head_office'::"text", 'project'::"text"])))
);

-- contract_templates
CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "country_code" "text",
    "employment_type" "text",
    "body_html" "text" DEFAULT ''::"text" NOT NULL,
    "placeholders" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- contractor_pay_run_items
CREATE TABLE IF NOT EXISTS "public"."contractor_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "contract_rate" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "project_hours" numeric(8,2) DEFAULT 0.00,
    "milestone_completion" numeric(5,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "withholding_tax" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "contractor_fees" numeric(12,2) DEFAULT 0.00,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "contract_type" character varying(50) DEFAULT 'hourly'::character varying,
    "project_id" "uuid",
    "invoice_number" character varying(100),
    "payment_terms" character varying(50) DEFAULT 'net_30'::character varying,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- countries
CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- email_events
CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "key" "text" NOT NULL PRIMARY KEY,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_events_category_check" CHECK (("category" = ANY (ARRAY['auth'::"text", 'payroll'::"text", 'system'::"text", 'approval'::"text"])))
);

-- email_outbox
CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "event_key" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_msg_id" "text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    CONSTRAINT "email_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text"])))
);

-- email_placeholders
CREATE TABLE IF NOT EXISTS "public"."email_placeholders" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "example_value" "text",
    "category" "text" NOT NULL,
    "is_locked" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_placeholders_category_check" CHECK (("category" = ANY (ARRAY['organization'::"text", 'employee'::"text", 'payroll'::"text", 'approval'::"text", 'system'::"text"])))
);

-- email_templates
CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "org_id" "uuid",
    "event_key" "text" NOT NULL,
    "subject_template" "text" NOT NULL,
    "body_html_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "design" "jsonb",
    "version" integer DEFAULT 1,
    UNIQUE (org_id, event_key)
);

-- email_triggers
CREATE TABLE IF NOT EXISTS "public"."email_triggers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);

-- employee_categories
CREATE TABLE IF NOT EXISTS "public"."employee_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- employee_contracts
CREATE TABLE IF NOT EXISTS "public"."employee_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "contract_number" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "auto_renew" boolean DEFAULT false NOT NULL,
    "salary_snapshot" "jsonb",
    "terms_snapshot" "jsonb",
    "body_html" "text",
    "signed_by_employee_at" timestamp with time zone,
    "signed_by_employer_at" timestamp with time zone,
    "signed_by_employer_name" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "employee_contracts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'signed'::"text", 'active'::"text", 'expired'::"text", 'terminated'::"text"])))
);

-- employee_types
CREATE TABLE IF NOT EXISTS "public"."employee_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);

-- expatriate_pay_run_item_allowances
CREATE TABLE IF NOT EXISTS "public"."expatriate_pay_run_item_allowances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expatriate_pay_run_item_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- head_office_pay_group_company_units
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_group_company_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "company_unit_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- head_office_pay_group_members
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "removed_at" timestamp with time zone,
    "added_by" "uuid"
);

-- head_office_pay_groups_expatriates
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_expatriates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'expatriate'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "exchange_rate_to_local" numeric(12,4) DEFAULT 0 NOT NULL,
    "tax_country" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_expatriates_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_expatriates_employee_type_check" CHECK (("employee_type" = 'expatriate'::"text"))
);

-- head_office_pay_groups_interns
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_interns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'intern'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_interns_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_interns_employee_type_check" CHECK (("employee_type" = 'intern'::"text"))
);

-- head_office_pay_groups_regular
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_groups_regular" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'head_office'::"text",
    "employee_type" "text" DEFAULT 'regular'::"text",
    "name" "text" NOT NULL,
    "pay_frequency" "text" DEFAULT 'monthly'::"text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."head_office_status" DEFAULT 'draft'::"public"."head_office_status",
    "source_pay_group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "head_office_pay_groups_regular_category_check" CHECK (("category" = 'head_office'::"text")),
    CONSTRAINT "head_office_pay_groups_regular_employee_type_check" CHECK (("employee_type" = 'regular'::"text"))
);

-- intern_pay_groups
CREATE TABLE IF NOT EXISTS "public"."intern_pay_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid",
    "paygroup_id" "text",
    "name" "text",
    "country" "text",
    "currency" "text" DEFAULT 'USD'::"text",
    "exchange_rate_to_local" numeric DEFAULT 0,
    "tax_country" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- head_office_pay_run_items
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "basic_pay" numeric(12,2) DEFAULT 0,
    "allowances" numeric(12,2) DEFAULT 0,
    "gross_pay" numeric(12,2) DEFAULT 0,
    "nssf" numeric(12,2) DEFAULT 0,
    "paye" numeric(12,2) DEFAULT 0,
    "other_deductions" numeric(12,2) DEFAULT 0,
    "total_deductions" numeric(12,2) DEFAULT 0,
    "net_pay" numeric(12,2) DEFAULT 0,
    "currency" "text",
    "exchange_rate" numeric(12,4),
    "net_foreign" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- head_office_pay_runs
CREATE TABLE IF NOT EXISTS "public"."head_office_pay_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "pay_group_type" "public"."head_office_pay_group_type" NOT NULL,
    "pay_group_id" "uuid" NOT NULL,
    "pay_run_id" "text",
    "pay_period_start" "date" NOT NULL,
    "pay_period_end" "date" NOT NULL,
    "pay_run_date" "date" DEFAULT CURRENT_DATE,
    "status" "text" DEFAULT 'draft'::"text",
    "total_gross_pay" numeric(12,2) DEFAULT 0,
    "total_deductions" numeric(12,2) DEFAULT 0,
    "total_net_pay" numeric(12,2) DEFAULT 0,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- impersonation_logs
CREATE TABLE IF NOT EXISTS "public"."impersonation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "super_admin_id" "uuid" NOT NULL,
    "target_user_id" "uuid",
    "target_organization_id" "uuid",
    "target_role" "text" NOT NULL,
    "impersonation_start" timestamp with time zone NOT NULL,
    "impersonation_end" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- intern_pay_run_items
CREATE TABLE IF NOT EXISTS "public"."intern_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "stipend_amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "learning_hours" numeric(8,2) DEFAULT 0.00,
    "project_hours" numeric(8,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "internship_duration_months" integer,
    "mentor_id" "uuid",
    "sub_department" character varying(100),
    "learning_objectives" "text"[],
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- items_catalog
CREATE TABLE IF NOT EXISTS "public"."items_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "unit" "text" DEFAULT 'unit'::"text",
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- local_pay_run_items
CREATE TABLE IF NOT EXISTS "public"."local_pay_run_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pay_run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "basic_salary" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "hours_worked" numeric(8,2),
    "overtime_hours" numeric(8,2) DEFAULT 0.00,
    "overtime_rate" numeric(10,2) DEFAULT 0.00,
    "pieces_completed" integer,
    "piece_rate" numeric(10,2) DEFAULT 0.00,
    "gross_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "benefit_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "custom_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "total_deductions" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "net_pay" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "nssf_employee" numeric(12,2) DEFAULT 0.00,
    "nssf_employer" numeric(12,2) DEFAULT 0.00,
    "paye_tax" numeric(12,2) DEFAULT 0.00,
    "local_currency" character varying(3) DEFAULT 'UGX'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- notifications
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['security_alert'::"text", 'account_locked'::"text", 'account_unlocked'::"text", 'login_alert'::"text", 'system_update'::"text", 'payroll_alert'::"text", 'approval_request'::"text", 'general'::"text"])))
);

-- org_license_assignments
CREATE TABLE IF NOT EXISTS "public"."org_license_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "seat_type" "text" DEFAULT 'default'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);

-- org_licenses
CREATE TABLE IF NOT EXISTS "public"."org_licenses" (
    "org_id" "uuid" NOT NULL,
    "seat_limit" integer DEFAULT 0 NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_licenses_seat_limit_check" CHECK (("seat_limit" >= 0))
);

-- org_roles
CREATE TABLE IF NOT EXISTS "public"."org_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "system_defined" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- org_settings
CREATE TABLE IF NOT EXISTS "public"."org_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "max_approval_levels" integer DEFAULT 5 NOT NULL,
    "approvals_sequential" boolean DEFAULT true NOT NULL,
    "approvals_allow_delegation" boolean DEFAULT true NOT NULL,
    "approvals_rejection_comment_required" boolean DEFAULT true NOT NULL,
    "approvals_visibility_non_admin" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payroll_approvals_enabled" boolean DEFAULT false,
    "approvals_enabled_scopes" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "org_settings_max_approval_levels_check" CHECK ((("max_approval_levels" >= 1) AND ("max_approval_levels" <= 20)))
);

-- org_user_roles
CREATE TABLE IF NOT EXISTS "public"."org_user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);

-- org_users
CREATE TABLE IF NOT EXISTS "public"."org_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "org_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'invited'::"text", 'disabled'::"text"])))
);

-- organization_security_settings
CREATE TABLE IF NOT EXISTS "public"."organization_security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "lockout_threshold" integer DEFAULT 5 NOT NULL,
    "email_alerts_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_security_settings_lockout_threshold_check" CHECK ((("lockout_threshold" >= 3) AND ("lockout_threshold" <= 10)))
);

-- payroll_configurations
CREATE TABLE IF NOT EXISTS "public"."payroll_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "use_strict_mode" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- payrun_approval_steps
CREATE TABLE IF NOT EXISTS "public"."payrun_approval_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payrun_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "approver_user_id" "uuid",
    "approver_role" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "actioned_at" timestamp with time zone,
    "actioned_by" "uuid",
    "comments" "text",
    "original_approver_id" "uuid",
    "delegated_by" "uuid",
    "delegated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "workflow_version" integer,
    "override_reason" "text",
    "override_by" "uuid",
    "override_at" timestamp with time zone,
    CONSTRAINT "payrun_approval_steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'skipped'::"text", 'approved_overridden'::"text"])))
);

-- platform_admin_devices
CREATE TABLE IF NOT EXISTS "public"."platform_admin_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "device_name" "text",
    "browser" "text",
    "os" "text",
    "approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- platform_email_settings
CREATE TABLE IF NOT EXISTS "public"."platform_email_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "provider_name" "text" DEFAULT 'resend'::"text" NOT NULL,
    "default_from_name" "text" DEFAULT 'PayRun Pro'::"text" NOT NULL,
    "default_from_email" "text" DEFAULT 'no-reply@payroll.flipafrica.app'::"text" NOT NULL,
    "default_reply_to" "text",
    "enforce_identity" boolean DEFAULT true NOT NULL,
    "rate_limit_per_tenant" integer DEFAULT 1000 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);

-- probation_reminder_logs
CREATE TABLE IF NOT EXISTS "public"."probation_reminder_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- project_onboarding_steps
CREATE TABLE IF NOT EXISTS "public"."project_onboarding_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "step_key" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- projects
CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_type" "text",
    "project_subtype" "text",
    "allowed_pay_types" "text"[],
    "supports_all_pay_types" boolean DEFAULT false NOT NULL,
    "organization_id" "uuid",
    "responsible_manager_id" "uuid",
    "client_name" "text",
    "location" "text",
    "contract_value" numeric,
    CONSTRAINT "projects_project_subtype_check" CHECK (("project_subtype" = ANY (ARRAY['daily'::"text", 'bi_weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "projects_project_type_check" CHECK (("project_type" = ANY (ARRAY['manpower'::"text", 'ippms'::"text", 'expatriate'::"text"]))),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'completed'::"text"])))
);

-- role_assignments
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

-- tenant_email_settings
CREATE TABLE IF NOT EXISTS "public"."tenant_email_settings" (
    "org_id" "uuid" NOT NULL,
    "emails_enabled" boolean DEFAULT true NOT NULL,
    "use_custom_sender" boolean DEFAULT false NOT NULL,
    "custom_from_name" "text",
    "custom_from_email" "text",
    "custom_reply_to" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);

-- timesheet_departments
CREATE TABLE IF NOT EXISTS "public"."timesheet_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- timesheet_entries
CREATE TABLE IF NOT EXISTS "public"."timesheet_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timesheet_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "hours_worked" numeric(5,2) NOT NULL,
    "department" "text" NOT NULL,
    "task_description" "text" NOT NULL,
    "linked_pay_run_id" "uuid",
    "is_aggregated" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_in" "text",
    "time_out" "text",
    "employee_sign" "text",
    "supervisor_comments" "text",
    "supervisor_sign" "text",
    CONSTRAINT "timesheet_entries_hours_worked_check" CHECK ((("hours_worked" > (0)::numeric) AND ("hours_worked" <= (24)::numeric)))
);

-- timesheets
CREATE TABLE IF NOT EXISTS "public"."timesheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "reviewer_notes" "text",
    "total_hours" numeric(8,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "timesheets_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text"])))
);

-- user_company_memberships
CREATE TABLE IF NOT EXISTS "public"."user_company_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- user_management_invitations
CREATE TABLE IF NOT EXISTS "public"."user_management_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "department" "text",
    "phone" "text",
    "invited_by" "uuid",
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- user_management_profiles
CREATE TABLE IF NOT EXISTS "public"."user_management_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone" "text",
    "department" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "full_name" "text",
    "email" "text",
    "role" "text",
    CONSTRAINT "user_management_profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);

-- variable_item_logs
CREATE TABLE IF NOT EXISTS "public"."variable_item_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "work_log_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "catalog_item_id" "uuid",
    "item_name" "text" NOT NULL,
    "item_unit" "text" DEFAULT 'unit'::"text",
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "quantity" numeric(10,3) DEFAULT 0 NOT NULL,
    "total_cost" numeric(14,2) DEFAULT 0,
    "work_date" "date" NOT NULL,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- variable_pay_cycles
CREATE TABLE IF NOT EXISTS "public"."variable_pay_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "pay_group_id" "uuid",
    "cycle_name" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "total_daily_cost" numeric(14,2) DEFAULT 0,
    "total_piece_cost" numeric(14,2) DEFAULT 0,
    "total_allowances" numeric(14,2) DEFAULT 0,
    "total_net_pay" numeric(14,2) DEFAULT 0,
    "notes" "text",
    "locked_by" "uuid",
    "locked_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "variable_pay_cycles_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'locked'::"text", 'processed'::"text"])))
);

-- variable_pay_summaries
CREATE TABLE IF NOT EXISTS "public"."variable_pay_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "days_present" integer DEFAULT 0,
    "total_daily_pay" numeric(14,2) DEFAULT 0,
    "total_piece_pay" numeric(14,2) DEFAULT 0,
    "allowance_house" numeric(14,2) DEFAULT 0,
    "allowance_travel" numeric(14,2) DEFAULT 0,
    "allowance_airtime" numeric(14,2) DEFAULT 0,
    "allowance_medical" numeric(14,2) DEFAULT 0,
    "allowance_seating" numeric(14,2) DEFAULT 0,
    "gross_pay" numeric(14,2) DEFAULT 0,
    "tax_deduction" numeric(14,2) DEFAULT 0,
    "nssf_employee" numeric(14,2) DEFAULT 0,
    "other_deductions" numeric(14,2) DEFAULT 0,
    "net_pay" numeric(14,2) DEFAULT 0,
    "work_log_validated" boolean DEFAULT false,
    "validation_errors" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- variable_work_logs
CREATE TABLE IF NOT EXISTS "public"."variable_work_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "attendance_status" "text" DEFAULT 'present'::"text" NOT NULL,
    "hours_worked" numeric(6,2) DEFAULT 8,
    "daily_rate" numeric(14,2) DEFAULT 0,
    "daily_cost" numeric(14,2) DEFAULT 0,
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "variable_work_logs_attendance_status_check" CHECK (("attendance_status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'leave'::"text", 'half_day'::"text"])))
);

-- Add missing columns to employees table (added directly on remote DB)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_unit_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS sub_department_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_type_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS sub_type TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pay_frequency TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS number_prefix_override TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_joined DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_status TEXT DEFAULT 'not_applicable';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_notes TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'monthly';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS sub_department TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_category TEXT;

-- Add missing columns to companies table (added directly on remote DB)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add missing columns to projects table (added directly on remote DB)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add missing columns to pay_runs table (added directly on remote DB)
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS sub_type TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS pay_frequency TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS payroll_type TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS days_worked NUMERIC DEFAULT 0;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 0;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS pay_group_master_id UUID;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS total_gross NUMERIC;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS total_net NUMERIC;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS payroll_status TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS pay_type TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS employee_type TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS approval_status TEXT;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS approval_current_level INTEGER;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS approval_submitted_at TIMESTAMPTZ;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS approval_submitted_by UUID;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS approval_last_action_at TIMESTAMPTZ;

-- Add missing columns to pay_groups table (added directly on remote DB)
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS employee_type TEXT;
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS pay_frequency TEXT;
ALTER TABLE public.pay_groups ADD COLUMN IF NOT EXISTS pay_type TEXT;

-- Add missing columns to user_profiles table (added directly on remote DB)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS platform_admin_role TEXT;

-- Add missing columns to audit_logs table (needed by OBAC RLS policies)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add missing columns to pay_items table (added directly on remote DB)
ALTER TABLE public.pay_items ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.pay_items ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add missing organization_id to expatriate_pay_groups and intern_pay_groups
ALTER TABLE public.expatriate_pay_groups ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.intern_pay_groups ADD COLUMN IF NOT EXISTS organization_id UUID;
