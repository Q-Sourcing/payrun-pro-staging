-- Zoho People Integration Database Schema

-- Integration tokens table for OAuth storage
CREATE TABLE IF NOT EXISTS public.integration_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token_type VARCHAR(20) DEFAULT 'Bearer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(integration_name)
);

-- Sync configurations table
CREATE TABLE IF NOT EXISTS public.sync_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'bidirectional')),
    data_mapping JSONB DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    retry_attempts INTEGER DEFAULT 3,
    timeout INTEGER DEFAULT 30000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration health monitoring table
CREATE TABLE IF NOT EXISTS public.integration_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
    last_sync TIMESTAMP WITH TIME ZONE,
    uptime DECIMAL(5,2) DEFAULT 0,
    api_response_time INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    threshold DECIMAL(10,2) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT '{}',
    escalation_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification channels table
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'webhook', 'slack')),
    name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert logs table
CREATE TABLE IF NOT EXISTS public.alert_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    integration_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records table for storing Zoho attendance data
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'holiday')),
    leave_type VARCHAR(50),
    remarks TEXT,
    synced_from_zoho BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_tokens_name ON public.integration_tokens(integration_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON public.sync_logs(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_integration_health_name_checked ON public.integration_health(integration_name, checked_at);
CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_id ON public.alert_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_triggered_at ON public.alert_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_integration_action ON public.audit_logs(integration_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, date);

-- Comments for documentation
COMMENT ON TABLE public.integration_tokens IS 'Stores OAuth tokens for external integrations';
COMMENT ON TABLE public.sync_configurations IS 'Configuration for data synchronization between systems';
COMMENT ON TABLE public.sync_logs IS 'Logs of synchronization operations';
COMMENT ON TABLE public.integration_health IS 'Health monitoring data for integrations';
COMMENT ON TABLE public.alert_rules IS 'Rules for triggering alerts based on integration health';
COMMENT ON TABLE public.notification_channels IS 'Channels for sending alerts and notifications';
COMMENT ON TABLE public.alert_logs IS 'Log of triggered alerts';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for integration activities';
COMMENT ON TABLE public.attendance_records IS 'Attendance records synced from Zoho People';

-- Row Level Security (RLS) policies
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (adjust based on your auth setup)
CREATE POLICY "Admin access to integration data" ON public.integration_tokens
    FOR ALL USING (true); -- Adjust this based on your authentication system

CREATE POLICY "Admin access to sync configurations" ON public.sync_configurations
    FOR ALL USING (true);

CREATE POLICY "Admin access to sync logs" ON public.sync_logs
    FOR ALL USING (true);

CREATE POLICY "Admin access to integration health" ON public.integration_health
    FOR ALL USING (true);

CREATE POLICY "Admin access to alert rules" ON public.alert_rules
    FOR ALL USING (true);

CREATE POLICY "Admin access to notification channels" ON public.notification_channels
    FOR ALL USING (true);

CREATE POLICY "Admin access to alert logs" ON public.alert_logs
    FOR ALL USING (true);

CREATE POLICY "Admin access to audit logs" ON public.audit_logs
    FOR ALL USING (true);

CREATE POLICY "Admin access to attendance records" ON public.attendance_records
    FOR ALL USING (true);
