-- Add foreign key constraints to payslip_generations and user_management tables
-- This migration runs after pay_runs, employees, users, and pay_groups tables are created

-- Add the foreign key constraint for pay_run_id (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payslip_generations_pay_run_id_fkey'
    ) THEN
        ALTER TABLE public.payslip_generations
        ADD CONSTRAINT payslip_generations_pay_run_id_fkey
        FOREIGN KEY (pay_run_id)
        REFERENCES public.pay_runs(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add the foreign key constraint for employee_id (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payslip_generations_employee_id_fkey'
    ) THEN
        ALTER TABLE public.payslip_generations
        ADD CONSTRAINT payslip_generations_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for user_activities (if they don't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_activities_user_id_fkey'
        ) THEN
            ALTER TABLE public.user_activities
            ADD CONSTRAINT user_activities_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints for user_invitations (if they don't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_invitations_manager_id_fkey'
        ) THEN
            ALTER TABLE public.user_invitations
            ADD CONSTRAINT user_invitations_manager_id_fkey
            FOREIGN KEY (manager_id)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_invitations_invited_by_fkey'
        ) THEN
            ALTER TABLE public.user_invitations
            ADD CONSTRAINT user_invitations_invited_by_fkey
            FOREIGN KEY (invited_by)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key constraints for user_management_actions (if they don't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_management_actions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_management_actions_performed_by_fkey'
        ) THEN
            ALTER TABLE public.user_management_actions
            ADD CONSTRAINT user_management_actions_performed_by_fkey
            FOREIGN KEY (performed_by)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_management_actions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_management_actions_target_user_id_fkey'
        ) THEN
            ALTER TABLE public.user_management_actions
            ADD CONSTRAINT user_management_actions_target_user_id_fkey
            FOREIGN KEY (target_user_id)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add foreign key constraint for user_invitations organization_id (if it doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_invitations_organization_id_fkey'
        ) THEN
            ALTER TABLE public.user_invitations
            ADD CONSTRAINT user_invitations_organization_id_fkey
            FOREIGN KEY (organization_id)
            REFERENCES public.pay_groups(id)
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
