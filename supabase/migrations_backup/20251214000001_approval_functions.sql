-- ==========================================================
-- APPROVAL WORKFLOW RPC FUNCTIONS
-- ==========================================================

-- 1. Helper to Check if User is Super Admin
-- (Moved to 20251214000000_approval_workflows.sql as check_is_super_admin to resolve dependency issues)
-- CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)...

-- 2. Submit Payrun for Approval
CREATE OR REPLACE FUNCTION public.submit_payrun_for_approval(payrun_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_workflow_id uuid;
    v_step RECORD;
    v_org_id uuid;
    v_next_approver_id uuid;
    v_count int;
BEGIN
    -- 1. Validation
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN
        RAISE EXCEPTION 'Payrun not found';
    END IF;
    
    -- Check Status (must be draft or rejected to resubmit)
    IF v_payrun.status NOT IN ('draft', 'rejected') AND v_payrun.approval_status NOT IN ('draft', 'rejected') THEN
         RAISE EXCEPTION 'Payrun must be in draft or rejected status to submit. Current: %', v_payrun.status;
    END IF;
    
    -- 2. Find Organization (Assumes pay_group_id links to Org)
    SELECT organization_id INTO v_org_id 
    FROM public.users -- Or however we link to Org
    WHERE id = auth.uid(); 
    -- Alternative: Get from pay_group if payrun -> pay_group -> org linkage exists
    -- For now using auth user's org
    
    -- 3. Find Active Workflow
    -- We select the default active workflow for the org
    SELECT id INTO v_workflow_id
    FROM public.approval_workflows
    WHERE org_id = v_org_id AND is_active = true
    LIMIT 1;
    
    IF v_workflow_id IS NULL THEN
        RAISE EXCEPTION 'No active approval workflow found for this organization. Please contact your Super Admin.';
    END IF;
    
    -- 4. Clear existing steps if any (retry logic)
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    -- 5. Clone Steps
    -- We assume simple User-based assignment for now based on the prompt "Approver (user dropdown)"
    FOR v_step IN 
        SELECT * FROM public.approval_workflow_steps 
        WHERE workflow_id = v_workflow_id 
        ORDER BY level ASC 
    LOOP
        INSERT INTO public.payrun_approval_steps (
            payrun_id,
            level,
            approver_user_id,
            approver_role,
            status
        ) VALUES (
            payrun_id_input,
            v_step.level,
            v_step.approver_user_id,
            v_step.approver_role,
            CASE WHEN v_step.level = 1 THEN 'pending' ELSE 'pending' END -- All pending, but effectively locked by sequential level check
        );
        
        IF v_step.level = 1 THEN
            v_next_approver_id := v_step.approver_user_id;
        END IF;
    END LOOP;
    
    -- 6. Update Payrun Status
    UPDATE public.pay_runs
    SET 
        approval_status = 'pending_approval',
        status = 'pending_approval', -- Sync both
        approval_current_level = 1,
        approval_submitted_at = now(),
        approval_submitted_by = auth.uid(),
        approval_last_action_at = now()
    WHERE id = payrun_id_input;
    
    -- 7. Notify First Approver
    IF v_next_approver_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            metadata
        ) VALUES (
            v_next_approver_id,
            'approval_request',
            'Payrun Approval Required',
            'A payrun matches your approval level and requires attention.',
            jsonb_build_object('payrun_id', payrun_id_input)
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'next_approver', v_next_approver_id);
END;
$$;


-- 3. Approve Step
CREATE OR REPLACE FUNCTION public.approve_payrun_step(
    payrun_id_input uuid, 
    comments_input text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
    v_next_level int;
    v_next_step RECORD;
    v_max_level int;
BEGIN
    -- 1. Get Payrun & Current Level
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun is not pending approval'; 
    END IF;
    
    -- 2. Get the Step for Current User
    -- Must be current level AND assigned to user
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'You are not the designated approver for the current level (%)', v_payrun.approval_current_level;
    END IF;
    
    -- 3. Update Step
    UPDATE public.payrun_approval_steps
    SET 
        status = 'approved',
        actioned_at = now(),
        actioned_by = auth.uid(),
        comments = comments_input
    WHERE id = v_step.id;
    
    -- 4. Check Next Level
    v_next_level := v_payrun.approval_current_level + 1;
    
    SELECT count(*) INTO v_max_level 
    FROM public.payrun_approval_steps 
    WHERE payrun_id = payrun_id_input;
    
    IF v_next_level <= v_max_level THEN
        -- Move to Next Level
        UPDATE public.pay_runs
        SET 
            approval_current_level = v_next_level,
            approval_last_action_at = now()
        WHERE id = payrun_id_input;
        
        -- Notify Next
        SELECT * INTO v_next_step 
        FROM public.payrun_approval_steps
        WHERE payrun_id = payrun_id_input AND level = v_next_level;
        
        INSERT INTO public.notifications (
            user_id, type, title, message, metadata
        ) VALUES (
            v_next_step.approver_user_id,
            'approval_request',
            'Payrun Approval Required',
            'A payrun is awaiting your approval (Level ' || v_next_level || ')',
            jsonb_build_object('payrun_id', payrun_id_input)
        );
        
        RETURN jsonb_build_object('status', 'progressing', 'next_level', v_next_level);
    ELSE
        -- All Approved
        UPDATE public.pay_runs
        SET 
            approval_status = 'approved',
            status = 'locked', -- Locking payrun
            approval_current_level = NULL,
            approval_last_action_at = now(),
            approved_at = now(),
            approved_by = auth.uid()
        WHERE id = payrun_id_input;
        
        -- Notify Creator
        INSERT INTO public.notifications (
            user_id, type, title, message, metadata
        ) VALUES (
            v_payrun.created_by,
            'payroll_alert',
            'Payrun Approved',
            'Your payrun has been fully approved and is now locked.',
            jsonb_build_object('payrun_id', payrun_id_input)
        );
        
        RETURN jsonb_build_object('status', 'approved');
    END IF;
END;
$$;


-- 4. Reject Step
CREATE OR REPLACE FUNCTION public.reject_payrun_step(
    payrun_id_input uuid, 
    comments_input text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending approval'; 
    END IF;

    -- Verify User
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level
      AND approver_user_id = auth.uid();
      
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'Not authorized to reject this step';
    END IF;

    -- Update Step
    UPDATE public.payrun_approval_steps
    SET 
        status = 'rejected',
        actioned_at = now(),
        actioned_by = auth.uid(),
        comments = comments_input
    WHERE id = v_step.id;

    -- Update Payrun
    UPDATE public.pay_runs
    SET 
        approval_status = 'rejected',
        status = 'rejected',
        approval_last_action_at = now()
    WHERE id = payrun_id_input;
    
    -- Notify Creator
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        v_payrun.created_by,
        'payroll_alert',
        'Payrun Rejected',
        'Your payrun was rejected at Level ' || v_payrun.approval_current_level || '. Reason: ' || COALESCE(comments_input, 'None'),
        jsonb_build_object('payrun_id', payrun_id_input)
    );

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 5. Delegate Step
CREATE OR REPLACE FUNCTION public.delegate_approval_step(
    payrun_id_input uuid,
    new_approver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.approval_status != 'pending_approval' THEN 
        RAISE EXCEPTION 'Payrun not pending'; 
    END IF;
    
    -- Must be current approver OR admin
    -- For simplicty checking current approver first
    SELECT * INTO v_step 
    FROM public.payrun_approval_steps
    WHERE payrun_id = payrun_id_input
      AND level = v_payrun.approval_current_level;
      
    IF v_step.approver_user_id != auth.uid() AND NOT public.check_is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to delegate';
    END IF;
    
    -- Perform Delegation
    UPDATE public.payrun_approval_steps
    SET 
        original_approver_id = CASE WHEN original_approver_id IS NULL THEN approver_user_id ELSE original_approver_id END,
        approver_user_id = new_approver_id,
        delegated_by = auth.uid(),
        delegated_at = now()
    WHERE id = v_step.id;
    
    -- Notify New Approver
    INSERT INTO public.notifications (
        user_id, type, title, message, metadata
    ) VALUES (
        new_approver_id,
        'approval_request',
        'Delegated Approval',
        'An approval step has been delegated to you.',
        jsonb_build_object('payrun_id', payrun_id_input)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Return Payrun to Draft
CREATE OR REPLACE FUNCTION public.return_payrun_to_draft(
    payrun_id_input uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payrun RECORD;
BEGIN
    SELECT * INTO v_payrun FROM public.pay_runs WHERE id = payrun_id_input;
    
    IF v_payrun.id IS NULL THEN RAISE EXCEPTION 'Payrun not found'; END IF;
    
    -- Only allow if rejected (or maybe pending if admin? Sticking to plan: rejected)
    IF v_payrun.approval_status != 'rejected' THEN
        RAISE EXCEPTION 'Only rejected payruns can be returned to draft. Current status: %', v_payrun.approval_status;
    END IF;
    
    -- Check permissions: Creator or Admin
    IF v_payrun.created_by != auth.uid() AND NOT public.check_is_org_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to reset this payrun';
    END IF;

    -- 1. DELETE approval steps
    DELETE FROM public.payrun_approval_steps WHERE payrun_id = payrun_id_input;
    
    -- 2. Reset Payrun
    UPDATE public.pay_runs
    SET 
        approval_status = 'draft',
        status = 'draft',
        approval_current_level = NULL,
        approval_submitted_at = NULL,
        approval_submitted_by = NULL,
        approval_last_action_at = NULL,
        approved_at = NULL,
        approved_by = NULL
    WHERE id = payrun_id_input;
    
    RETURN jsonb_build_object('success', true);
END;
$$;
