-- User Role System Database Schema

-- Users table with role-based access control
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin',
        'organization_admin', 
        'ceo_executive',
        'payroll_manager',
        'employee',
        'hr_business_partner',
        'finance_controller'
    )),
    organization_id UUID REFERENCES public.pay_groups(id) ON DELETE SET NULL,
    department_id VARCHAR(100),
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 480, -- 8 hours in minutes
    permissions TEXT[] DEFAULT '{}',
    restrictions TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role assignments table for tracking role changes
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin',
        'organization_admin', 
        'ceo_executive',
        'payroll_manager',
        'employee',
        'hr_business_partner',
        'finance_controller'
    )),
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Audit logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permission checks table for caching permission results
CREATE TABLE IF NOT EXISTS public.permission_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    has_permission BOOLEAN NOT NULL,
    context JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    dashboard_config JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON public.users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON public.role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON public.role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_role_assignments_active ON public.role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_role_assignments_assigned_at ON public.role_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
-- Add result column if it doesn't exist (for compatibility with earlier audit_logs table)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS result VARCHAR(20) CHECK (result IN ('success', 'failure', 'denied'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON public.audit_logs(result);

CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON public.permission_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_cache_resource ON public.permission_cache(resource);
CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON public.permission_cache(expires_at);

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User accounts with role-based access control';
COMMENT ON TABLE public.role_assignments IS 'History of role assignments and changes';
COMMENT ON TABLE public.user_sessions IS 'Active user sessions for security management';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all user actions and system events';
COMMENT ON TABLE public.permission_cache IS 'Cached permission check results for performance';
COMMENT ON TABLE public.user_preferences IS 'User-specific preferences and dashboard configuration';

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Organization admins can view organization users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = 'organization_admin'
            AND u2.id = public.users.id
            AND u1.organization_id = u2.organization_id
        )
    );

CREATE POLICY "Department managers can view department users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = 'payroll_manager'
            AND u2.id = public.users.id
            AND u1.department_id = u2.department_id
        )
    );

-- RLS Policies for role assignments
CREATE POLICY "Users can view their own role assignments" ON public.role_assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all role assignments" ON public.role_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'organization_admin')
        )
    );

-- RLS Policies for user sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'organization_admin')
        )
    );

-- RLS Policies for audit logs (handle data type compatibility)
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs 
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'organization_admin')
        )
    );

-- RLS Policies for permission cache
CREATE POLICY "Users can view their own permission cache" ON public.permission_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage permission cache" ON public.permission_cache
    FOR ALL USING (true); -- Allow system operations

-- RLS Policies for user preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Functions for role-based access control
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN (
        SELECT role FROM public.users 
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_permission(
    user_id UUID, 
    permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired permission cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.permission_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default super admin user (for initial setup)
INSERT INTO public.users (
    email,
    first_name,
    last_name,
    role,
    is_active,
    two_factor_enabled,
    session_timeout,
    permissions,
    restrictions
) VALUES (
    'admin@payroll.com',
    'Super',
    'Administrator',
    'super_admin',
    true,
    true,
    480,
    ARRAY[
        'view_all_employees',
        'edit_all_employees',
        'process_payroll',
        'approve_payroll',
        'view_financial_reports',
        'view_executive_reports',
        'manage_users',
        'system_configuration',
        'view_audit_logs',
        'manage_integrations',
        'view_system_health',
        'view_sensitive_data',
        'export_data',
        'bulk_operations',
        'delete_records'
    ],
    ARRAY[]::TEXT[]
) ON CONFLICT (email) DO NOTHING;
