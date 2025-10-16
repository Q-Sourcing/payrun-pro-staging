-- Super Admin Setup Migration
-- This migration sets up the initial super administrator account

-- Insert the pre-configured super admin user
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    two_factor_enabled,
    session_timeout,
    permissions,
    restrictions,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'nalungukevin@gmail.com',
    'Nalungu',
    'Kevin',
    'super_admin',
    true,
    false, -- Will be set up during initial login
    480, -- 8 hours
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
    ARRAY[]::TEXT[],
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions,
    restrictions = EXCLUDED.restrictions,
    updated_at = NOW();

-- Create a function to check if this is the first login
CREATE OR REPLACE FUNCTION public.is_first_login(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT last_login IS NULL 
        FROM public.users 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get super admin setup status
CREATE OR REPLACE FUNCTION public.get_super_admin_setup_status()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to complete super admin setup
CREATE OR REPLACE FUNCTION public.complete_super_admin_setup(
    user_id UUID,
    security_questions JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to generate secure temporary password
CREATE OR REPLACE FUNCTION public.generate_temp_password()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to send setup email (placeholder)
CREATE OR REPLACE FUNCTION public.send_super_admin_setup_email(
    user_email TEXT,
    temp_password TEXT
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON public.audit_logs(action, timestamp);

-- Add comments for documentation
COMMENT ON FUNCTION public.is_first_login(UUID) IS 'Check if this is the users first login';
COMMENT ON FUNCTION public.get_super_admin_setup_status() IS 'Get the current status of super admin setup';
COMMENT ON FUNCTION public.complete_super_admin_setup(UUID, JSONB) IS 'Mark super admin setup as complete';
COMMENT ON FUNCTION public.generate_temp_password() IS 'Generate a secure temporary password';
COMMENT ON FUNCTION public.send_super_admin_setup_email(TEXT, TEXT) IS 'Send setup email to super admin';

-- Create a view for super admin dashboard
CREATE OR REPLACE VIEW public.super_admin_dashboard AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.two_factor_enabled,
    u.last_login,
    u.created_at,
    COUNT(DISTINCT s.id) as active_sessions,
    COUNT(DISTINCT al.id) as recent_activity_count
FROM public.users u
LEFT JOIN public.user_sessions s ON u.id = s.user_id AND s.is_active = true
LEFT JOIN public.audit_logs al ON u.id::text = al.user_id 
    AND al.timestamp >= NOW() - INTERVAL '24 hours'
WHERE u.role = 'super_admin'
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
         u.two_factor_enabled, u.last_login, u.created_at;

-- Grant necessary permissions
GRANT SELECT ON public.super_admin_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_first_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_setup_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_super_admin_setup(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_temp_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_super_admin_setup_email(TEXT, TEXT) TO authenticated;
