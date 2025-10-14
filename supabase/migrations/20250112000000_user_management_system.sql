-- User Management System Database Schema
-- This migration extends the existing user system with comprehensive user management features

-- Create user activities table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user invitations table for managing user creation
CREATE TABLE IF NOT EXISTS public.user_invitations (
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
    permissions JSONB DEFAULT '[]',
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user management actions table for audit trail
CREATE TABLE IF NOT EXISTS public.user_management_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    performed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create_user',
        'update_user',
        'deactivate_user',
        'activate_user',
        'change_role',
        'reset_password',
        'send_invitation',
        'cancel_invitation',
        'bulk_update',
        'export_users'
    )),
    details JSONB DEFAULT '{}',
    previous_values JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON public.user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_resource ON public.user_activities(resource);
CREATE INDEX IF NOT EXISTS idx_user_activities_performed_at ON public.user_activities(performed_at);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_management_actions_performed_by ON public.user_management_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_management_actions_target_user ON public.user_management_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_management_actions_type ON public.user_management_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_management_actions_performed_at ON public.user_management_actions(performed_at);

-- Enable Row Level Security
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_management_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all activities" ON public.user_activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Organization admins can view organization activities" ON public.user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = 'organization_admin'
            AND u2.id = public.user_activities.user_id
            AND u1.organization_id = u2.organization_id
        )
    );

-- RLS Policies for user_invitations
CREATE POLICY "Super admins can manage all invitations" ON public.user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Organization admins can manage organization invitations" ON public.user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'organization_admin'
            AND organization_id = (
                SELECT organization_id FROM public.users 
                WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for user_management_actions
CREATE POLICY "Super admins can view all management actions" ON public.user_management_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Organization admins can view organization management actions" ON public.user_management_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u1, public.users u2
            WHERE u1.id = auth.uid() 
            AND u1.role = 'organization_admin'
            AND u2.id = public.user_management_actions.target_user_id
            AND u1.organization_id = u2.organization_id
        )
    );

-- Create function to automatically clean up expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.user_invitations 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user management actions
CREATE OR REPLACE FUNCTION public.log_user_management_action(
    p_performed_by UUID,
    p_target_user_id UUID,
    p_action_type VARCHAR(50),
    p_details JSONB DEFAULT '{}',
    p_previous_values JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    action_id UUID;
BEGIN
    INSERT INTO public.user_management_actions (
        performed_by,
        target_user_id,
        action_type,
        details,
        previous_values,
        ip_address,
        user_agent
    ) VALUES (
        p_performed_by,
        p_target_user_id,
        p_action_type,
        p_details,
        p_previous_values,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO action_id;
    
    RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource VARCHAR(100),
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.user_activities (
        user_id,
        action,
        resource,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action,
        p_resource,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
    p_email VARCHAR(255),
    p_first_name VARCHAR(100),
    p_last_name VARCHAR(100),
    p_role VARCHAR(50),
    p_organization_id UUID DEFAULT NULL,
    p_department_id VARCHAR(100) DEFAULT NULL,
    p_manager_id UUID DEFAULT NULL,
    p_permissions JSONB DEFAULT '[]',
    p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
BEGIN
    -- Generate secure token
    invitation_token := public.generate_invitation_token();
    
    -- Check if email already exists in users table
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;
    
    -- Check if invitation already exists
    IF EXISTS (SELECT 1 FROM public.user_invitations WHERE email = p_email AND status = 'pending') THEN
        RAISE EXCEPTION 'Invitation for email % already exists', p_email;
    END IF;
    
    -- Insert invitation
    INSERT INTO public.user_invitations (
        email,
        first_name,
        last_name,
        role,
        organization_id,
        department_id,
        manager_id,
        permissions,
        invited_by,
        token
    ) VALUES (
        p_email,
        p_first_name,
        p_last_name,
        p_role,
        p_organization_id,
        p_department_id,
        p_manager_id,
        p_permissions,
        p_invited_by,
        invitation_token
    ) RETURNING id INTO invitation_id;
    
    -- Log the action
    PERFORM public.log_user_management_action(
        p_invited_by,
        NULL,
        'send_invitation',
        jsonb_build_object('email', p_email, 'role', p_role, 'invitation_id', invitation_id)
    );
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept invitation and create user
CREATE OR REPLACE FUNCTION public.accept_user_invitation(
    p_token VARCHAR(255),
    p_password_hash TEXT
)
RETURNS UUID AS $$
DECLARE
    invitation_record RECORD;
    new_user_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.user_invitations
    WHERE token = p_token 
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
    
    -- Create user account (this would integrate with Supabase Auth)
    -- For now, we'll create a record in our users table
    INSERT INTO public.users (
        email,
        first_name,
        last_name,
        role,
        organization_id,
        department_id,
        manager_id,
        permissions,
        created_by
    ) VALUES (
        invitation_record.email,
        invitation_record.first_name,
        invitation_record.last_name,
        invitation_record.role,
        invitation_record.organization_id,
        invitation_record.department_id,
        invitation_record.manager_id,
        invitation_record.permissions,
        invitation_record.invited_by
    ) RETURNING id INTO new_user_id;
    
    -- Update invitation status
    UPDATE public.user_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Log the action
    PERFORM public.log_user_management_action(
        invitation_record.invited_by,
        new_user_id,
        'create_user',
        jsonb_build_object('email', invitation_record.email, 'role', invitation_record.role)
    );
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.user_activities IS 'Audit trail for all user actions and system events';
COMMENT ON TABLE public.user_invitations IS 'User invitation system for creating new accounts';
COMMENT ON TABLE public.user_management_actions IS 'Comprehensive audit trail for user management operations';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_invitations TO authenticated;
GRANT SELECT, INSERT ON public.user_management_actions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_management_action(UUID, UUID, VARCHAR, JSONB, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(UUID, VARCHAR, VARCHAR, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_invitation(VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_user_invitation(VARCHAR, TEXT) TO authenticated;
