-- ==========================================================
-- EMAIL MANAGEMENT SYSTEM SCHEMA - PHASE 1
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Email Events Catalog
-- Defines all system events that can trigger emails
CREATE TABLE IF NOT EXISTS public.email_events (
    key text PRIMARY KEY,
    description text NOT NULL,
    category text NOT NULL CHECK (category IN ('auth', 'payroll', 'system', 'approval')),
    variables jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of variable names available for this event
    created_at timestamptz DEFAULT now()
);

-- Seed Initial Events
INSERT INTO public.email_events (key, description, category, variables) VALUES
('PAYRUN_SUBMITTED', 'Triggered when a payrun is submitted for approval', 'approval', '["payrun_id", "period", "submitted_by", "unapproved_count", "approver_name", "action_url"]'),
('PAYRUN_APPROVED', 'Triggered when a payrun is fully approved', 'approval', '["payrun_id", "period", "approved_by", "action_url"]'),
('PAYRUN_REJECTED', 'Triggered when a payrun is rejected', 'approval', '["payrun_id", "period", "rejected_by", "reason", "action_url"]'),
('APPROVAL_REMINDER', 'Reminder for pending approvals', 'approval', '["payrun_id", "period", "approver_name", "hours_pending", "action_url"]'),
('PAYSLIP_READY', 'Notification to employee that payslip is available', 'payroll', '["employee_name", "period", "download_url"]'),
('ACCOUNT_LOCKED', 'Security alert when account is locked', 'system', '["user_name", "user_email", "reason", "ip_address", "timestamp"]')
ON CONFLICT (key) DO UPDATE SET variables = EXCLUDED.variables;

-- 2. Platform Email Settings (Global)
CREATE TABLE IF NOT EXISTS public.platform_email_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Singleton enforcement
    is_active boolean NOT NULL DEFAULT true,
    
    -- Provider Config (Resend)
    -- API Key should be in Vault/Secrets, but we store non-sensitive config here
    provider_name text NOT NULL DEFAULT 'resend',
    default_from_name text NOT NULL DEFAULT 'PayRun Pro',
    default_from_email text NOT NULL DEFAULT 'no-reply@payroll.flipafrica.app',
    default_reply_to text,
    
    -- Governance
    enforce_identity boolean NOT NULL DEFAULT true, -- If true, tenants cannot change FROM address
    rate_limit_per_tenant int NOT NULL DEFAULT 1000, -- Emails per day
    
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_settings_singleton ON public.platform_email_settings ((true));

-- 3. Tenant Email Settings
CREATE TABLE IF NOT EXISTS public.tenant_email_settings (
    org_id uuid PRIMARY KEY, -- Linked to organizations
    
    -- Preferences
    emails_enabled boolean NOT NULL DEFAULT true,
    use_custom_sender boolean NOT NULL DEFAULT false,
    custom_from_name text,
    custom_from_email text, -- Only allowed if platform enforce_identity is false OR domain verified
    custom_reply_to text,
    
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- 4. Email Templates
-- Supports inheritance: System Default -> Tenant Override
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid, -- Null = Platform Default, Not Null = Tenant Override
    event_key text NOT NULL REFERENCES public.email_events(key),
    
    subject_template text NOT NULL,
    body_html_template text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    
    UNIQUE (org_id, event_key) -- One active template per event per scope
);

-- Seed Default Templates (Basic examples)
INSERT INTO public.email_templates (org_id, event_key, subject_template, body_html_template) VALUES
(
    NULL, 
    'PAYRUN_SUBMITTED', 
    'Action Required: Approval Needed for Payrun {{period}}', 
    '<h1>Approval Request</h1><p>Hello {{approver_name}},</p><p>A new payrun for period {{period}} has been submitted by {{submitted_by}}.</p><p><a href="{{action_url}}">View Payrun</a></p>'
),
(
    NULL,
    'PAYRUN_APPROVED',
    'Payrun Approved: {{period}}',
    '<h1>Payrun Approved</h1><p>The payrun for {{period}} has been fully approved by {{approved_by}}.</p>'
),
(
    NULL,
    'PAYRUN_REJECTED',
    'Payrun Rejected: {{period}}',
    '<h1>Action Required</h1><p>The payrun for {{period}} was rejected by {{rejected_by}}.</p><p><strong>Reason:</strong> {{reason}}</p>'
),
(
    NULL,
    'ACCOUNT_LOCKED',
    'Security Alert: Account Locked',
    '<h1>Account Locked</h1><p>User {{user_email}} was locked out at {{timestamp}}.</p><p>Reason: {{reason}}</p>'
)
ON CONFLICT (org_id, event_key) DO NOTHING;


-- 5. Email Triggers (Tenant Config)
-- Controls which events actually send emails for a specific tenant
CREATE TABLE IF NOT EXISTS public.email_triggers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL,
    event_key text NOT NULL REFERENCES public.email_events(key),
    is_enabled boolean NOT NULL DEFAULT true,
    
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id),
    
    UNIQUE (org_id, event_key)
);

-- 6. Email Outbox (The Queue)
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid, -- Nullable for system emails
    event_key text NOT NULL,
    
    recipient_email text NOT NULL,
    recipient_name text,
    
    subject text NOT NULL,
    body_html text NOT NULL,
    
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    
    -- Metadata
    provider_msg_id text, -- ID from Resend
    error_message text,
    retry_count int DEFAULT 0,
    next_retry_at timestamptz DEFAULT now(),
    
    created_at timestamptz DEFAULT now(),
    sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_org ON public.email_outbox(org_id);


-- ==========================================================
-- RLS POLICIES
-- ==========================================================

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- 1. Helper Functions
-- NOTE: `is_platform_admin()` and `is_org_admin(uuid)` already exist in previous migrations.
-- We reuse them here.


-- 2. Events (Public Read, Admin Write)
CREATE POLICY "Everyone can read email events" ON public.email_events FOR SELECT USING (true);

-- 3. Platform Settings (Admin Read/Write Only)
CREATE POLICY "Platform Admins can manage global settings" 
ON public.platform_email_settings FOR ALL 
USING (public.is_platform_admin());

-- 4. Tenant Settings (Org Admin Read/Write)
CREATE POLICY "Org Admins manage their settings" 
ON public.tenant_email_settings FOR ALL 
USING (public.is_org_admin(org_id))
WITH CHECK (public.is_org_admin(org_id));

CREATE POLICY "Platform Admins view tenant settings" 
ON public.tenant_email_settings FOR SELECT 
USING (public.is_platform_admin());

-- 5. Templates
-- Read: Everyone (to render) - or restricted? Edge function uses service role. 
-- Frontend needs read for template editor.
CREATE POLICY "Org Admins read own and default templates" 
ON public.email_templates FOR SELECT 
USING (
  org_id IS NULL -- System defaults
  OR public.is_org_admin(org_id) -- Own overrides
  OR public.is_platform_admin() -- Platform admins see all
);

CREATE POLICY "Org Admins write own templates" 
ON public.email_templates FOR INSERT 
WITH CHECK (org_id IS NOT NULL AND public.is_org_admin(org_id));

CREATE POLICY "Org Admins update own templates" 
ON public.email_templates FOR UPDATE 
USING (org_id IS NOT NULL AND public.is_org_admin(org_id));

CREATE POLICY "Platform Admins manage default templates" 
ON public.email_templates FOR ALL 
USING (org_id IS NULL AND public.is_platform_admin());

-- 6. Triggers
CREATE POLICY "Org Admins manage triggers" 
ON public.email_triggers FOR ALL 
USING (public.is_org_admin(org_id));

-- 7. Outbox (Logs)
CREATE POLICY "Org Admins view own logs" 
ON public.email_outbox FOR SELECT 
USING (public.is_org_admin(org_id));

CREATE POLICY "Platform Admins view all logs" 
ON public.email_outbox FOR SELECT 
USING (public.is_platform_admin());
